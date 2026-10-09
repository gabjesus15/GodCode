update storage.buckets
set public = false
where id in ('products', 'receipts');
