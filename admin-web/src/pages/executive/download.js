/** With responseType "blob", error bodies arrive as Blobs; read them back as JSON. */
export const readBlobError = async (error) => {
  const data = error?.response?.data;
  if (!(data instanceof Blob) || !data.type.includes("json")) return null;
  try {
    return JSON.parse(await data.text());
  } catch {
    return null;
  }
};

export const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
