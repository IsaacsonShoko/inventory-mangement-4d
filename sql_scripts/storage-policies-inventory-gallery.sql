-- Storage Policies for "Inventory Gallery" Bucket
-- This bucket stores inventory item images

-- ============================================
-- POLICY SETUP
-- ============================================

-- 1. Allow PUBLIC READ access (anyone can view images)
-- This is important for displaying images on the website
CREATE POLICY "Public read access for Inventory Gallery"
ON storage.objects FOR SELECT
USING (bucket_id = 'Inventory Gallery');

-- 2. Allow AUTHENTICATED users to UPLOAD images
-- Only logged-in users can upload inventory images
CREATE POLICY "Authenticated users can upload to Inventory Gallery"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'Inventory Gallery'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'inventory-images'
);

-- 3. Allow users to UPDATE their own uploads
-- Users can replace images they uploaded
CREATE POLICY "Users can update their own uploads in Inventory Gallery"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'Inventory Gallery'
  AND auth.uid() = owner
)
WITH CHECK (
  bucket_id = 'Inventory Gallery'
  AND auth.uid() = owner
  AND (storage.foldername(name))[1] = 'inventory-images'
);

-- 4. Allow ADMINS to DELETE images
-- Only admins can delete inventory images
CREATE POLICY "Admins can delete from Inventory Gallery"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'Inventory Gallery'
  AND (
    auth.uid() IN (
      SELECT id FROM user_profiles WHERE role = 'admin'
    )
  )
);

-- ============================================
-- OPTIONAL: BACK OFFICE ACCESS
-- ============================================

-- Allow back_office users to also delete images
CREATE POLICY "Back office can delete from Inventory Gallery"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'Inventory Gallery'
  AND (
    auth.uid() IN (
      SELECT id FROM user_profiles WHERE role IN ('admin', 'back_office')
    )
  )
);

-- ============================================
-- BUCKET CONFIGURATION (Informational)
-- ============================================

-- To ensure bucket is public, run in Supabase Dashboard:
-- Go to Storage → Inventory Gallery → Configuration
-- Enable: "Public bucket" toggle

-- Bucket settings should be:
-- - Bucket name: "Inventory Gallery"
-- - Public: YES (enabled)
-- - File size limit: 5MB (recommended for images)
-- - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- ============================================
-- VERIFY POLICIES
-- ============================================

-- Check all policies for the bucket
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND qual::text LIKE '%Inventory Gallery%'
ORDER BY policyname;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

/*
-- Upload from StockAdmin.tsx:
const { error } = await supabase.storage
  .from('Inventory Gallery')
  .upload('inventory-images/item_name_123.jpg', file);

-- Get public URL:
const { data } = supabase.storage
  .from('Inventory Gallery')
  .getPublicUrl('inventory-images/item_name_123.jpg');

-- Delete (admin only):
const { error } = await supabase.storage
  .from('Inventory Gallery')
  .remove(['inventory-images/item_name_123.jpg']);
*/

-- ============================================
-- NOTES
-- ============================================

/*
SECURITY CONSIDERATIONS:
1. Public bucket means anyone can view images via direct URL
2. Only authenticated users can upload
3. Only admins/back_office can delete
4. File paths are restricted to 'inventory-images/' folder
5. Consider adding file size limits in application code

BEST PRACTICES:
1. Use unique filenames (timestamp + item name) to avoid conflicts
2. Validate file types before upload (JPEG, PNG, WebP only)
3. Compress images before upload to save storage
4. Clean up orphaned images when items are deleted
5. Monitor storage usage in Supabase dashboard
*/
