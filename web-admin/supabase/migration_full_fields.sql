
-- Add missing columns to instances table
do $$
begin
    -- maintenance mode
    if not exists (select 1 from information_schema.columns where table_name = 'instances' and column_name = 'maintenance') then
        alter table instances add column maintenance boolean default false;
    end if;

    -- maintenance message
    if not exists (select 1 from information_schema.columns where table_name = 'instances' and column_name = 'maintenance_message') then
        alter table instances add column maintenance_message text default '';
    end if;

    -- modpack version
    if not exists (select 1 from information_schema.columns where table_name = 'instances' and column_name = 'modpack_version') then
        alter table instances add column modpack_version text default '';
    end if;

    -- ignore files (array of text)
    if not exists (select 1 from information_schema.columns where table_name = 'instances' and column_name = 'ignore_files') then
        alter table instances add column ignore_files text[] default '{}';
    end if;

    -- forge version
    if not exists (select 1 from information_schema.columns where table_name = 'instances' and column_name = 'forge_version') then
        alter table instances add column forge_version text default '';
    end if;

    -- server ip
    if not exists (select 1 from information_schema.columns where table_name = 'instances' and column_name = 'server_ip') then
        alter table instances add column server_ip text default '';
    end if;

    -- loader version
    if not exists (select 1 from information_schema.columns where table_name = 'instances' and column_name = 'loader_version') then
        alter table instances add column loader_version text default '';
    end if;

    -- announcement
    if not exists (select 1 from information_schema.columns where table_name = 'instances' and column_name = 'announcement') then
        alter table instances add column announcement text default '';
    end if;

    -- announcement image
    if not exists (select 1 from information_schema.columns where table_name = 'instances' and column_name = 'announcement_image') then
        alter table instances add column announcement_image text default '';
    end if;

    -- background image
    if not exists (select 1 from information_schema.columns where table_name = 'instances' and column_name = 'background_image') then
        alter table instances add column background_image text default '';
    end if;

    -- Ensure allowed_players exists (from previous step, but good to double check)
    if not exists (select 1 from information_schema.columns where table_name = 'instances' and column_name = 'allowed_players') then
        alter table instances add column allowed_players text[] default '{}';
    end if;

end $$;
