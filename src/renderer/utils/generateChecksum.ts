import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { stat } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';


const execAsync = promisify(exec);

export const readFileInChunks = async (filePath: string, chunkSize: number = 10 * 1024 * 1024) => {
    const chunks: Buffer[] = [];
    const readStream = createReadStream(filePath, {
        highWaterMark: chunkSize, // 10MB chunks
    });

    for await (const chunk of readStream) {
        chunks.push(chunk);
    }

    return chunks;
};

export const getFilesFromDirectory = async (directoryPath: string): Promise<string[]> => {
    try {
        const files = await fs.readdir(directoryPath);

        const videoFiles = files

        return videoFiles;
    } catch (error) {
        console.error('Error reading directory:', { error: error.message });
        return [];
    }
};

export const calculateInsvChecksum = async (filePath: string): Promise<string> => {
    try {
        const fileName = path.basename(filePath);

        const fileStats = await stat(filePath);
        const basicMetadata = `${fileStats.size}-${fileStats.mtimeMs}`;

        const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format "${filePath}"`);
        const metadata = JSON.stringify(JSON.parse(stdout).format || {});

        const hash = createHash('sha256').update(fileName + basicMetadata + metadata).digest('hex');

        return hash;
    } catch (error) {
        throw new Error(`Error al calcular checksum: ${error}`);
    }
};

if (require.main === module) {
    const filePath = process.argv[2];

    if (!filePath) {
        console.error('Please provide a file path');
        process.exit(1);
    }

    const startTime = process.hrtime();

    // Add file validation
    fs.stat(filePath)
        .then(stats => {
            if (!stats.isFile()) {
                console.error('Error: The path provided is not a file');
                process.exit(1);
            }

            return calculateInsvChecksum(filePath);
        })
        .then(checksum => {
            const endTime = process.hrtime(startTime);
            const executionTime = (endTime[0] + endTime[1] / 1e9).toFixed(2);

            console.log(`Checksum for ${filePath}:`);
            console.log(checksum);
            console.log(`Process completed in ${executionTime} seconds`);
        })
        .catch(error => {
            console.error('Error calculating checksum:', error.message);
            process.exit(1);
        });
}