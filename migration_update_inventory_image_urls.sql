-- Migration: Replace AWS S3 image URLs with Supabase Storage URLs
-- Table: public.inventory_items
-- Date: 2026-03-27
-- Only updates item_url — all other columns remain unchanged.
-- New base: https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/

-- Payment Terminals
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/verizon-z9.jpg',           updated_at = NOW() WHERE id = 146;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/clover-flex-device.jpg',     updated_at = NOW() WHERE id = 147;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/n950-smart-terminal-side.avif', updated_at = NOW() WHERE id = 152;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/Ingenico%20Axium.webp',      updated_at = NOW() WHERE id = 153;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/dx8000-cradle.jpg',           updated_at = NOW() WHERE id = 157;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/PAX-A910S-white.jpg',         updated_at = NOW() WHERE id = 158;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/pax-cradle-0.jpg',            updated_at = NOW() WHERE id = 162;

-- Bikes & Cycling
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/mountain-handlebars.png',     updated_at = NOW() WHERE id = 141;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/mountain-bike-front-wheel.png', updated_at = NOW() WHERE id = 142;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/mountain-bike-seat.png',      updated_at = NOW() WHERE id = 143;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/white-helmet.png',            updated_at = NOW() WHERE id = 144;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/road-bike-seat.png',          updated_at = NOW() WHERE id = 145;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/mountain-bike-rear-wheel.png', updated_at = NOW() WHERE id = 148;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/road-red-frame.png',          updated_at = NOW() WHERE id = 149;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/road-white-frame.png',        updated_at = NOW() WHERE id = 150;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/road-bike-red.png',           updated_at = NOW() WHERE id = 151;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/touring-panniers.png',        updated_at = NOW() WHERE id = 154;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/road-handlebars.png',         updated_at = NOW() WHERE id = 155;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/red-long-sleeve-jersey.png',  updated_at = NOW() WHERE id = 156;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/mountain-bike-black.png',     updated_at = NOW() WHERE id = 159;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/bike-chain.png',              updated_at = NOW() WHERE id = 160;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/mountain-bike-frame.png',     updated_at = NOW() WHERE id = 161;
UPDATE public.inventory_items SET item_url = 'https://rtwusqcbgpayllzgxiwh.supabase.co/storage/v1/object/public/Inventory%20Gallery/mountain-bike-pedal.png',     updated_at = NOW() WHERE id = 163;
