export const listFilesAndDirectories = (dirPath,results=[]) => {
  

    const items = fs.readdirSync(dirPath);
    items.forEach((item) => {
      const fullPath = path.join(dirPath, item);
      
      const stat = fs.statSync(fullPath);
  
      if (stat.isDirectory()) {
        const subfolder = []
        listFilesAndDirectories(fullPath,subfolder); // Recursively list subdirectories and files
        results.push({ isFolder: true,path:fullPath,name: item,children: subfolder});
      } else if (stat.isFile()) {
        const name = item.split('@date')[1]
        const creationDate = item.split('@date')[0]
      
        results.push({isFolder: false,path:fullPath,name,creationDate});
      }
    });
  
    return results;
  };