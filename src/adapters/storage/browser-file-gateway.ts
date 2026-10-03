import type { FileGateway } from '../../application/ports/file-gateway';

export const browserFileGateway: FileGateway = {
  saveText: (fileName, text) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  },
  openText: () =>
    new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.oncancel = () => {
        resolve(undefined);
      };
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          file.text().then(resolve, () => {
            reject(new Error('The file could not be read.'));
          });
        } else resolve(undefined);
      };
      input.click();
    }),
};
