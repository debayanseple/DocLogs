-- Optional payment amount for follow-up appointments.
alter table follow_ups
  add column if not exists payment_due numeric(12,2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'follow_ups_payment_due_nonnegative'
      and conrelid = 'public.follow_ups'::regclass
  ) then
    alter table follow_ups
      add constraint follow_ups_payment_due_nonnegative
      check (payment_due is null or payment_due >= 0);
  end if;
end $$;
