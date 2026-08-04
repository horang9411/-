export const MAX_TASK_ATTACHMENT_SIZE = 4 * 1024 * 1024;
export const MAX_TASK_ATTACHMENT_COUNT = 5;

const allowedFileTypes: Record<string, readonly string[]> = {
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  txt: ["text/plain"],
  csv: ["text/csv", "application/vnd.ms-excel"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  zip: ["application/zip", "application/x-zip-compressed"],
};

export const taskAttachmentAccept = Object.keys(allowedFileTypes)
  .map((extension) => `.${extension}`)
  .join(",");

export function getTaskFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function validateTaskAttachments(files: File[], existingCount = 0) {
  if (files.length + existingCount > MAX_TASK_ATTACHMENT_COUNT) {
    return `첨부파일은 최대 ${MAX_TASK_ATTACHMENT_COUNT}개까지 등록할 수 있습니다.`;
  }

  if (
    files.reduce((totalSize, file) => totalSize + file.size, 0) >
    MAX_TASK_ATTACHMENT_SIZE
  ) {
    return "한 번에 추가하는 첨부파일은 전체 합계 4MB까지 등록할 수 있습니다.";
  }

  for (const file of files) {
    if (!file.size) return `${file.name} 파일이 비어 있습니다.`;
    if (file.name.length > 255) return "첨부파일 이름은 255자 이하만 허용됩니다.";
    if (file.size > MAX_TASK_ATTACHMENT_SIZE) {
      return `${file.name} 파일이 4MB를 초과합니다.`;
    }

    const extension = getTaskFileExtension(file.name);
    const allowedMimes = allowedFileTypes[extension];
    if (!allowedMimes || !allowedMimes.includes(file.type)) {
      return `${file.name} 파일의 확장자와 형식을 확인해 주세요.`;
    }
  }

  return null;
}
