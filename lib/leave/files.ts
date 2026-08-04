export const MAX_LEAVE_ATTACHMENT_SIZE = 4 * 1024 * 1024;

const allowedFileTypes: Record<string, readonly string[]> = {
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
};

export const leaveAttachmentAccept = Object.keys(allowedFileTypes)
  .map((extension) => `.${extension}`)
  .join(",");

export function getLeaveFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function validateLeaveAttachment(file: File | null) {
  if (!file) return null;
  if (!file.size) return "첨부파일이 비어 있습니다.";
  if (file.name.length > 255) return "첨부파일 이름은 255자 이하만 허용됩니다.";
  if (file.size > MAX_LEAVE_ATTACHMENT_SIZE) return "첨부파일은 최대 4MB까지 등록할 수 있습니다.";

  const extension = getLeaveFileExtension(file.name);
  const mimes = allowedFileTypes[extension];
  if (!mimes || !mimes.includes(file.type)) {
    return "첨부파일의 확장자와 형식을 확인해 주세요.";
  }
  return null;
}
