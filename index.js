const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const mime = require('mime-types');

const app = express();
const PORT = process.env.PORT || 5001;

const fileTypes = {
    images: ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff"],
    videos: ["video/mp4", "video/avi", "video/mkv", "video/mov", "video/wmv", "video/flv"],
    audio: ["audio/mp3", "audio/wav", "audio/aac", "audio/flac", "audio/ogg", "audio/m4a","audio/mpeg"],
    documents: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain", "text/csv", "text/html"],
    others: ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed", "application/x-tar"]
  };


  async function moveFile(src, dest) {
    try {
      await fs.copyFile(src, dest);
      await fs.unlink(src);
      console.log('File successfully moved!');
    } catch (err) {
      console.error('Error moving file:', err);
    }
  }


function getPublicURL(filePath) {
    // Normalize the path to ensure consistency
    const normalizedPath = path.normalize(filePath);

    // Split the path into parts
    const parts = normalizedPath.split(path.sep);

    // Find the index of the specified directory ('eligindi')
    const index = parts.indexOf('eligindi');

    if (index === -1) {
        console.log("The specified directory 'eligindi' was not found in the path.");
        return filePath;
    }

    // Extract the part of the path after 'eligindi'
    const pathAfterEligindi = parts.slice(index+1).join(path.sep);

    // Return the new path that starts from 'eligindi'
    return `/public/${pathAfterEligindi}`;
}

function getFileType(filePath) {
    // Get the MIME type
    const mimeType = mime.lookup(filePath);

    // Return the MIME type or 'unknown' if it couldn't be determined
    return mimeType || 'unknown';
}
function getFileCreationDate(name,index=0) {
    
    const filedate = name?.split(`@date`)[index];
    const date = new Date(filedate);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
}

function convertDateFormat(dateString) {
    // Split the input date string by '-'
    let [day, month, year] = dateString.split('-');
    
    // Rearrange to 'YYYY-MM-DD'
    return `${year}-${month}-${day}`;
}

function getFileCreationDateCall(name,index=0) {
    

    const filedate = convertDateFormat(name?.split(`@date`)[index]);
    const date = new Date(filedate);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
}


 function getFolderCreationDate(folderPath) {
 
      const stats =  fs.statSync(folderPath);
      const creationDate = stats.birthtime;
      const formattedDate = creationDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
  
      
      return formattedDate
    
  }

  async function getFilesbyType(types, dirPath, results = []) {
    console.log(dirPath);
    const items = await fs.readdir(dirPath);

    for (const item of items) {
        if(item == 'Calls') continue;
        const fullPath = path.join(dirPath, item);
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
            await getFilesbyType(types, fullPath, results);
        } else if (stat.isFile()) {
            const filetype = getFileType(fullPath);
            if (types.includes(filetype)) {
                results.push({
                    path: fullPath,
                    name: item.split('@date')[1],
                    isFolder: false,
                    public_url: getPublicURL(fullPath),
                    type: filetype,
                    date: getFileCreationDate(item),
                    size: (stat.size / (1024 * 1024)).toFixed(2)
                });
            }
        }
    }

    return results;
}

const rootPath = path.join(path.join(__dirname,'eligindi'));
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use('/public',express.static(rootPath))

// File upload setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Utility function to get full path
const getFullPath = (folderPath) => path.join(folderPath);




// 1. Create Folder
app.post('/api/folder', async (req, res) => {
    let { folderPath,folderName } = req.body;

    if(!folderName || !folderName) return res.status(401).json({message: 'please give folderpath and foldername'})
    folderPath = `${folderPath || rootPath}/${folderName}`;
   
    try {
        await fs.ensureDir(getFullPath(folderPath));
        res.status(201).json({ message: 'Folder created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Get Folder Contents by Path
app.get('/api/folder', async (req, res) => {
    const { folderPath } = req.query;
    const fullPath = folderPath ? getFullPath(folderPath) : rootPath;
   
    
    try {
        let files = fs.readdirSync(fullPath);
        files = files.map((item) => {
            if(item == 'Calls') return undefined;
            if(folderPath?.includes('/root/speech-to-text-dashboard/root')){
                const itemFullPath = path.join(fullPath, item);
                const stat = fs.statSync(itemFullPath);
                const isFolder = stat.isDirectory();
                const itemDate = isFolder ? getFolderCreationDate(itemFullPath) : getFileCreationDateCall(item,1);
         
                return {
                    path: itemFullPath,
                    name: isFolder ? item : item.split('@date')[2],
                    isFolder,
                    public_url: getPublicURL(itemFullPath),
                    type: getFileType(itemFullPath),
                    date: itemDate,
                    size: (stat.size / (1024 * 1024)).toFixed(2),
                    platform: item.split('@date')[0],
                    isTranscribed: true,
                    transcribePath: itemFullPath,
                }
            }else{
                const itemFullPath = path.join(fullPath, item);
                const stat = fs.statSync(itemFullPath);
                const isFolder = stat.isDirectory();
                const itemDate = isFolder ? getFolderCreationDate(itemFullPath) : getFileCreationDate(item);
                console.log(getFolderCreationDate(itemFullPath))
                return {
                    path: itemFullPath,
                    name: isFolder ? item : item.split('@date')[1],
                    isFolder,
                    public_url: getPublicURL(itemFullPath),
                    type: getFileType(itemFullPath),
                    date: itemDate,
                    size: (stat.size / (1024 * 1024)).toFixed(2)
                }
            }
            
        })

        files = files.filter((item) => item != undefined);
        if(fullPath == rootPath){
            files.push({
                path: "/root/speech-to-text-dashboard/root",
                name: "Transcribe",
                isFolder: true,
                public_url: "/root/speech-to-text-dashboard/root",
                type: 'unknown',
                date: "16 Aug 2024",
                size: 0
            })
        }
        


        res.status(200).json(files);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/calls', async (req, res) => {

    const folderPath = req.query.folderPath;
    
    const fullPath =  folderPath ? getFullPath(folderPath) : path.join(rootPath,'Calls');
    
    try {
        let files = fs.readdirSync(fullPath);
        files = files.map((item) => {
            const itemFullPath = path.join(fullPath, item);
            
            const stat = fs.statSync(itemFullPath);
            const isFolder = stat.isDirectory();
            const itemDate = isFolder ? getFolderCreationDate(itemFullPath) : getFileCreationDateCall(item,index=2);
            
            return {
                path: itemFullPath,
                name: isFolder ? item : item.split('@date')[4],
                isFolder,
                public_url: getPublicURL(itemFullPath),
                type: getFileType(itemFullPath),
                date: itemDate,
                size: (stat.size / (1024 * 1024)).toFixed(2),
                transcribePath: Buffer.from(item.split('@date')[0], 'base64').toString('utf-8'),
                platform: item.split('@date')[1],
                time: item.split('@date')[3]
            }
        })

        files = files.filter((item) => item != undefined);


        res.status(200).json(files);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/calls-folder', async (req, res) => {
    let { folderPath,folderName } = req.body;

    if(!folderName) return res.status(401).json({message: 'please give folderpath and foldername'})
    folderPath = `${folderPath || path.join(rootPath,'Calls')}/${folderName}`;
   
    try {
        await fs.ensureDir(getFullPath(folderPath));
        res.status(201).json({ message: 'Folder created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});




app.post('/api/move-file', async (req, res) => {

    const src = req.body.src;
    const dest = req.body.dest;
    
    
    
    try {
        await moveFile(src,dest);
        res.status(200).json({
            success: true,
            message: "File Move Successfully"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get file by type 
app.get('/api/files-by-type', async (req, res) => {
    const { type } = req.query;
    const types = fileTypes[type];
    if(!types){
        res.status(401).json({message: 'Invalid file type.'});
        return
    }

    const files = await  getFilesbyType(types,rootPath);
    res.status(200).json(files);
   
});

// 3. Create File
app.post('/api/file', upload.single('file'), async (req, res) => {
    const { filepath,filename,birthdate } = req.body;
    if(!filename) return res.status(401).json({error: 'please give filename'});
    const [name,ext] = filename.split('.');
    console.log(name,ext)
    const filefullpath = `${filepath || rootPath}/${birthdate}@date${name}.${ext}`;
    const fullPath = getFullPath(filefullpath);

    try {
        // Check if the filePath is a directory
        if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory()) {
            return res.status(400).json({ error: 'The provided path is a directory. Please provide a valid file path.' });
        }

        await fs.writeFile(fullPath, req.file.buffer);
        res.status(201).json({ message: 'File created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Read File
app.get('/api/file', async (req, res) => {
    const { filePath } = req.query;
    try {
        const data = await fs.readFile(getFullPath(filePath), 'utf8');
        res.status(200).send(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Update File
app.put('/api/file', upload.single('file'), async (req, res) => {
    const { filePath } = req.body;
    try {
        await fs.writeFile(getFullPath(filePath), req.file.buffer);
        res.status(200).json({ message: 'File updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Delete File
app.delete('/api/file', async (req, res) => {
    const { filePath } = req.query;
    try {
        await fs.remove(getFullPath(filePath));
        res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. Delete Folder
app.delete('/api/folder', async (req, res) => {
    const { folderPath } = req.query;
    try {
        await fs.remove(getFullPath(folderPath));
        res.status(200).json({ message: 'Folder deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


//save contact
// 2. Get Folder Contents by Path
app.post('/api/upload-contact', async (req, res) => {
    const { contact } = req.body;
    fs.writeFileSync('contact.json',JSON.stringify(contact));
    res.status(201).json({
        success: true,
        message: 'Upload Sucessfully'
    });
});


app.get('/api/read-contact', async (req, res) => {
   
    const data = fs.readFileSync('contact.json',{encoding: 'utf-8'});
    res.status(201).json({
        success: true,
        contact: JSON.parse(data)
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
