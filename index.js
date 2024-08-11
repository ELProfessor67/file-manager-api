const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// File upload setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Utility function to get full path
const getFullPath = (folderPath) => path.join(folderPath);
const rootPath = path.join(path.join(__dirname,'eligindi'));

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
    console.log(rootPath)
    
    try {
        let files = fs.readdirSync(fullPath);
        files = files.map(item => {
            const itemFullPath = path.join(fullPath, item);
            const stat = fs.statSync(itemFullPath);
            return {
                path: itemFullPath,
                name: item,
                isFolder: stat.isDirectory()
            }
        })
        res.status(200).json(files);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
