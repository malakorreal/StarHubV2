
-- Add allowed_players column to instances table if it doesn't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'instances' and column_name = 'allowed_players') then
        alter table instances add column allowed_players text[];
    end if;
end $$;
