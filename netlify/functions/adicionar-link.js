// Arquivo: netlify/functions/adicionar-link.js

const { Octokit } = require("@octokit/rest");

const GITHUB_OWNER = 'IUGUVENTAS';
const GITHUB_REPO = 'ENCURTADOR LATAM';
const FILE_PATH = 'links-db.js';

// A mesma sequência de memes que teremos no front-end
const memeSequence = [
    'IMG/calmatrav.webp', 'IMG/homerdancando.webp', 'IMG/aicemequebra.webp',
    'IMG/meme 1.webp', 'IMG/gordinhodancando.jpeg', 'IMG/fe9d8ca4-7fdf-44f3-8dd8-ef4f6e4c3022.webp'
];

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { url } = JSON.parse(event.body);
        const id = Math.random().toString(36).substring(2, 8);
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const octokit = new Octokit({ auth: GITHUB_TOKEN });

        let currentLinks = [];
        let fileSha = null;

        try {
            const { data } = await octokit.repos.getContent({
                owner: GITHUB_OWNER, repo: GITHUB_REPO, path: FILE_PATH,
            });
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            // Extrai apenas o array de dentro do arquivo
            const arrayString = content.substring(content.indexOf('[') , content.lastIndexOf(']') + 1);
            currentLinks = JSON.parse(arrayString);
            fileSha = data.sha;
        } catch (error) {
            if (error.status !== 404) throw error;
        }
        
        const memeIndex = currentLinks.length % memeSequence.length;
        const newMemeUrl = memeSequence[memeIndex];

        const newLink = { id, original: url, memeUrl: newMemeUrl };
        currentLinks.push(newLink);

        const updatedFileContent = `const ZedoLinksDB = ${JSON.stringify(currentLinks, null, 2)};`;

        await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: FILE_PATH,
            message: `[ZedoLink Bot] Adiciona link: ${id}`,
            content: Buffer.from(updatedFileContent).toString('base64'),
            sha: fileSha,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Link adicionado com sucesso!', id: id }),
        };
    } catch (error) {
        console.error('Erro:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao adicionar o link.' }) };
    }
};