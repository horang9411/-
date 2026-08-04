-- Vercel Function multipart 요청 본문 4.5MB 한도에 맞춰 신규 업로드를 4MB로 제한합니다.
update storage.buckets
set file_size_limit = 4194304
where id in ('profile-images', 'task-attachments', 'leave-attachments');
