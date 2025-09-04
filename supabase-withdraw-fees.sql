-- Таблица комиссий вывода по сетям
-- Для чего: хранить и менять через админку размер комиссии в нативной валюте сети
-- Используется /api/admin/settings и вкладка «Настройки» в админке

create table if not exists public.withdraw_fees (
  network text primary key, -- 'ton' | 'tron' | 'sol' | 'eth' | 'bnb'
  fee numeric not null default 0,
  updated_at timestamptz default now()
);

-- Отключаем RLS для этой таблицы (для админки)
alter table public.withdraw_fees disable row level security;

-- Начальные значения комиссий по умолчанию
insert into public.withdraw_fees(network, fee) values
  ('ton', 0.01),
  ('tron', 0),
  ('sol', 0.01),
  ('eth', 0.001),
  ('bnb', 0.01)
on conflict (network) do update set fee = excluded.fee;


