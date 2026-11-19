-- Prepared locally for owner review. Do not execute against DEV or Production
-- without explicit approval.

create or replace function public.admin_batch_update_inventory(p_changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  change jsonb;
  image_id uuid;
  product_id uuid;
  requested integer;
  expected integer;
  current_value integer;
  updated_count integer := 0;
begin
  if jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) = 0 then
    raise exception 'At least one inventory change is required';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_changes) first_change
    join jsonb_array_elements(p_changes) second_change
      on first_change < second_change
    where coalesce(first_change->>'image_id', first_change->>'product_id')
      = coalesce(second_change->>'image_id', second_change->>'product_id')
  ) then
    raise exception 'Duplicate inventory targets are not allowed';
  end if;

  -- Lock and validate every target before changing any row. An exception rolls
  -- back the whole function call, so the batch remains atomic.
  for change in select * from jsonb_array_elements(p_changes)
  loop
    image_id := nullif(change->>'image_id', '')::uuid;
    product_id := nullif(change->>'product_id', '')::uuid;
    requested := (change->>'value')::integer;
    expected := (change->>'expected_value')::integer;

    if (image_id is null) = (product_id is null)
       or requested < 0 or requested > 100000
       or expected < 0 or expected > 100000 then
      raise exception 'Invalid inventory change';
    end if;

    if image_id is not null then
      select available_quantity into current_value
      from product_variant_images
      where id = image_id
      for update;
    else
      select stock into current_value
      from products
      where id = product_id
      for update;
    end if;

    if current_value is null then
      raise exception 'Inventory target was not found or is not editable';
    end if;
    if current_value <> expected then
      raise exception 'Inventory changed elsewhere';
    end if;
  end loop;

  for change in select * from jsonb_array_elements(p_changes)
  loop
    image_id := nullif(change->>'image_id', '')::uuid;
    product_id := nullif(change->>'product_id', '')::uuid;
    requested := (change->>'value')::integer;

    if image_id is not null then
      update product_variant_images
      set available_quantity = requested
      where id = image_id;
    else
      update products
      set stock = requested, updated_at = now()
      where id = product_id;
    end if;
    updated_count := updated_count + 1;
  end loop;

  return jsonb_build_object('updated', updated_count);
end;
$$;

revoke all on function public.admin_batch_update_inventory(jsonb) from public, anon, authenticated;
grant execute on function public.admin_batch_update_inventory(jsonb) to service_role;
