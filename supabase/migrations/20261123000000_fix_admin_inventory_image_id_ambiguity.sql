-- Fix PL/pgSQL identifier collisions introduced after image_id was added to
-- product_variant_images. This recreates the batch function with fully
-- qualified table aliases and unambiguous local variable names.

create or replace function public.admin_batch_update_inventory(p_changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  change jsonb;
  v_image_id uuid;
  v_product_id uuid;
  v_requested integer;
  v_expected integer;
  v_current_value integer;
  v_updated_count integer := 0;
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

  for change in select * from jsonb_array_elements(p_changes)
  loop
    v_image_id := nullif(change->>'image_id', '')::uuid;
    v_product_id := nullif(change->>'product_id', '')::uuid;
    v_requested := (change->>'value')::integer;
    v_expected := (change->>'expected_value')::integer;

    if (v_image_id is null) = (v_product_id is null)
       or v_requested < 0 or v_requested > 100000
       or v_expected < 0 or v_expected > 100000 then
      raise exception 'Invalid inventory change';
    end if;

    if v_image_id is not null then
      select i.available_quantity into v_current_value
      from public.product_variant_images i
      where i.id = v_image_id
      for update;
    else
      select p.stock into v_current_value
      from public.products p
      where p.id = v_product_id
      for update;
    end if;

    if v_current_value is null then
      raise exception 'Inventory target was not found or is not editable';
    end if;
    if v_current_value <> v_expected then
      raise exception 'Inventory changed elsewhere';
    end if;
  end loop;

  for change in select * from jsonb_array_elements(p_changes)
  loop
    v_image_id := nullif(change->>'image_id', '')::uuid;
    v_product_id := nullif(change->>'product_id', '')::uuid;
    v_requested := (change->>'value')::integer;

    if v_image_id is not null then
      update public.product_variant_images i
      set available_quantity = v_requested
      where i.id = v_image_id;
    else
      update public.products p
      set stock = v_requested, updated_at = now()
      where p.id = v_product_id;
    end if;
    v_updated_count := v_updated_count + 1;
  end loop;

  return jsonb_build_object('updated', v_updated_count);
end;
$$;

revoke all on function public.admin_batch_update_inventory(jsonb) from public, anon, authenticated;
grant execute on function public.admin_batch_update_inventory(jsonb) to service_role;
