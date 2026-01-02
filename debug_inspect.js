const axios = require('axios');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const GIST_URL = 'https://gist.githubusercontent.com/malakorreal/d4a8ed5bb3eb3583d96258db1969f4ac/raw';
const tempZip = path.join(__dirname, 'temp_debug.zip');

async function run() {
    try {
        console.log('Fetching Gist...');
        const gistRes = await axios.get(GIST_URL);
        
        let data = gistRes.data;
        if (typeof data === 'string') {
            // Clean up like in instances.js
            data = data.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim();
            // Try to fix JSON format if needed
             if (data.startsWith('{') && data.endsWith('}') && /}\s*,\s*{/.test(data)) {
                  data = `[${data}]`
             }
        }
        
        console.log('Raw Data Length:', data.length);
        // console.log('Raw Data Preview:', data.substring(0, 500));
        
        const instances = (typeof data === 'string') ? JSON.parse(data) : data;
        console.log('Parsed Instances:', JSON.stringify(instances, null, 2));
        
        const instance = Array.isArray(instances) ? instances[0] : instances;
        
        console.log('Modpack URL:', instance.modpackUrl);
        
        if (!instance.modpackUrl) {
            console.log('No modpack URL found.');
            return;
        }

        console.log('Downloading modpack...');
        const response = await axios({
            url: instance.modpackUrl,
            method: 'GET',
            responseType: 'arraybuffer'
        });
        
        fs.writeFileSync(tempZip, response.data);
        console.log('Downloaded. Analyzing zip structure...');
        
        const zip = new AdmZip(tempZip);
        const entries = zip.getEntries();
        
        console.log('--- Zip Entries (First 20) ---');
        entries.slice(0, 20).forEach(e => console.log(e.entryName));
        
        const hasModsFolder = entries.some(e => e.entryName.startsWith('mods/'));
        console.log('Has "mods/" folder:', hasModsFolder);
        
        const rootFiles = entries.filter(e => !e.isDirectory && !e.entryName.includes('/'));
        console.log('Files at root:', rootFiles.map(e => e.entryName));

        // Cleanup
        fs.unlinkSync(tempZip);
        
    } catch (e) {
        console.error('Error:', e);
    }
}

run();