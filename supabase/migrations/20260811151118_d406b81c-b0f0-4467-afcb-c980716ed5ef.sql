do $$
declare v_uid uuid; v_wb uuid; v_partner uuid;
begin
  select id into v_uid from auth.users where email = 'qa.cust1@example.com';
  select id into v_wb from public.wash_bookings where customer_id = v_uid order by created_at desc limit 1;
  select id into v_partner from public.wash_vendors limit 1;
  update public.wash_bookings set status = 'confirmed', assigned_vendor_id = v_partner where id = v_wb;
  insert into public.wallets (user_id, balance) values (v_uid, 500000)
    on conflict (user_id) do update set balance = 500000;
  update public.profiles set dl_status = 'approved', dl_verified_at = now() where id = v_uid;
end $$;