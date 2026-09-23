-- Optional demo catalog. Run after schema.sql.
insert into public.products (slug,name,description,meaning,price,category,stock,image_url,occasion,gift_for,is_featured,is_published)
values
('olive-wood-cross','Olive Wood Cross','A warm handcrafted cross inspired by the enduring beauty of the Holy Land.','A timeless symbol of faith, hope, and a life rooted in Christ.',48,'Crosses',25,'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1000&q=85',array['Baptism','Wedding','Faith'],array['Her','Him','Couples'],true,true),
('scripture-bracelet','Scripture Bracelet','An understated bracelet designed to keep a favorite Scripture close.','A daily reminder to carry faith into ordinary moments.',32,'Jewelry',40,'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1000&q=85',array['Birthday','Graduation','Faith'],array['Her','Him','Friends'],true,true),
('prayer-journal','Prayer Journal','A linen-bound journal for prayers, gratitude, Scripture and reflection.','A quiet place to write, remember, and grow in faith.',26,'Prayer & Journals',60,'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1000&q=85',array['Birthday','Graduation','Faith'],array['Her','Him','Friends'],true,true),
('faith-candle','Faith Candle','A softly scented candle made for peaceful homes and meaningful gatherings.','A gentle symbol of light, peace, and hope.',29,'Candles',30,'https://images.unsplash.com/photo-1602874801006-e26c7d3d7f5c?auto=format&fit=crop&w=1000&q=85',array['Wedding','Housewarming','Birthday'],array['Her','Him','Couples'],true,true),
('baptism-keepsake','Baptism Keepsake Box','A keepsake box for preserving the little memories of a beautiful beginning.','A gift that turns one sacred day into a lifelong memory.',54,'Keepsakes',15,'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=85',array['Baptism'],array['Children','Godparents'],false,true),
('wedding-scripture-frame','Wedding Scripture Frame','A refined scripture-inspired frame for a couple''s new home.','A daily reminder to build a home around love and faith.',62,'Home Decor',12,'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85',array['Wedding'],array['Couples'],false,true)
on conflict (slug) do update set name=excluded.name,description=excluded.description,meaning=excluded.meaning,price=excluded.price,category=excluded.category,stock=excluded.stock,image_url=excluded.image_url,occasion=excluded.occasion,gift_for=excluded.gift_for,is_featured=excluded.is_featured,is_published=excluded.is_published;

insert into public.occasions(slug,name,subtitle,image_url,sort_order,is_published) values
('baptism','Baptism','Celebrate a new beginning.','https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&w=1200&q=85',1,true),
('wedding','Wedding','For a blessed beginning.','https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85',2,true),
('graduation','Graduation','Celebrate their next chapter.','https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=85',3,true),
('birthday','Birthday','A meaningful gift for someone special.','https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=85',4,true)
on conflict (slug) do update set name=excluded.name,subtitle=excluded.subtitle,image_url=excluded.image_url,sort_order=excluded.sort_order,is_published=excluded.is_published;

-- Gift Finder Questions and Options
insert into public.gift_questions(question,sort_order,is_active) values
('Who is this gift for?',1,true),
('What is the occasion?',2,true),
('What is your budget?',3,true),
('What kind of gift are you looking for?',4,true)
on conflict do nothing;

-- Gift Finder Options
-- Question 1: Who is this gift for?
insert into public.gift_options(question_id,label,value) 
select id,'Woman','Woman' from public.gift_questions where question='Who is this gift for?' limit 1
on conflict do nothing;

insert into public.gift_options(question_id,label,value) 
select id,'Man','Man' from public.gift_questions where question='Who is this gift for?' limit 1
on conflict do nothing;

insert into public.gift_options(question_id,label,value) 
select id,'Child','Child' from public.gift_questions where question='Who is this gift for?' limit 1
on conflict do nothing;

insert into public.gift_options(question_id,label,value) 
select id,'Couple','Couple' from public.gift_questions where question='Who is this gift for?' limit 1
on conflict do nothing;

insert into public.gift_options(question_id,label,value) 
select id,'Friend','Friend' from public.gift_questions where question='Who is this gift for?' limit 1
on conflict do nothing;

-- Question 2: What is the occasion?
insert into public.gift_options(question_id,label,value) 
select id,'Baptism','Baptism' from public.gift_questions where question='What is the occasion?' limit 1
on conflict do nothing;

insert into public.gift_options(question_id,label,value) 
select id,'Wedding','Wedding' from public.gift_questions where question='What is the occasion?' limit 1
on conflict do nothing;

insert into public.gift_options(question_id,label,value) 
select id,'Graduation','Graduation' from public.gift_questions where question='What is the occasion?' limit 1
on conflict do nothing;

insert into public.gift_options(question_id,label,value) 
select id,'Birthday','Birthday' from public.gift_questions where question='What is the occasion?' limit 1
on conflict do nothing;

insert into public.gift_options(question_id,label,value) 
select id,'Housewarming','Housewarming' from public.gift_questions where question='What is the occasion?' limit 1
on conflict do nothing;

-- Question 3: What is your budget?
insert into public.gift_options(question_id,label,value) 
select id,'Under 500 EGP','Under 500' from public.gift_questions where question='What is your budget?' limit 1
on conflict do nothing;

insert into public.gift_options(question_id,label,value) 
select id,'500–1,000 EGP','500–1,000' from public.gift_questions where question='What is your budget?' limit 1
on conflict do nothing;

insert into public.gift_options(question_id,label,value) 
select id,'1,000–2,000 EGP','1,000–2,000' from public.gift_questions where question='What is your budget?' limit 1
on conflict do nothing;

insert into public.gift_options(question_id,label,value) 
select id,'2,000+ EGP','2,000+' from public.gift_questions where question='What is your budget?' limit 1
on conflict do nothing;

-- Question 4: What kind of gift are you looking for?
insert into public.gift_options(question_id,label,value) 
select id,'Jewelry','Jewelry' from public.gift_questions where question='What kind of gift are you looking for?' limit 1
on conflict do nothing;

insert into public.gift_options(question_id,label,value) 
select id,'Home Decor','Home Decor' from public.gift_questions where question='What kind of gift are you looking for?' limit 1
on conflict do nothing;

insert into public.gift_options(question_id,label,value) 
select id,'Books','Books' from public.gift_questions where question='What kind of gift are you looking for?' limit 1
on conflict do nothing;

insert into public.gift_options(question_id,label,value) 
select id,'Christian Gifts','Christian Gifts' from public.gift_questions where question='What kind of gift are you looking for?' limit 1
on conflict do nothing;

insert into public.gift_options(question_id,label,value) 
select id,'Keepsakes','Keepsakes' from public.gift_questions where question='What kind of gift are you looking for?' limit 1
on conflict do nothing;

insert into public.gift_options(question_id,label,value) 
select id,'Any','Any' from public.gift_questions where question='What kind of gift are you looking for?' limit 1
on conflict do nothing;

-- After creating an Auth user, run this with that UUID:
-- insert into public.admin_users(id,email,role) values ('AUTH-USER-UUID','admin@example.com','super_admin');
