// Arquivo: netlify/functions/editar-link.js

// O require foi removido daqui de cima.

const GITHUB_OWNER = 'IUGUVENTAS';
const GITHUB_REPO = 'encurtador-latam';
const FILE_PATH = 'links.json';

exports.handler = async function(event) {
    // A CORREÇÃO ESTÁ AQUI: Usamos o import dinâmico dentro da função.
    const { Octokit } = await import("@octokit/rest");

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { id, newUrl } = JSON.parse(event.body);
        if (!id || !newUrl) {
            return { statusCode: 400, body: 'ID do link e nova URL são obrigatórios.' };
        }

        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

        const { data: fileData } = await octokit.repos.getContent({
            owner: GITHUB_OWNER, repo: GITHUB_REPO, path: FILE_PATH,
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        let links = JSON.parse(content);
        const fileSha = fileData.sha;

        const linkIndex = links.findIndex(link => link.id === id);
        if (linkIndex === -1) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Link com o ID fornecido não encontrado.' }) };
        }

        links[linkIndex].original = newUrl;

        const updatedFileContent = JSON.stringify(links, null, 2);

        await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER, repo: GITHUB_REPO, path: FILE_PATH,
            message: `[ZedoLink Bot] Edita link: ${id}`,
            content: Buffer.from(updatedFileContent).toString('base64'),
            sha: fileSha,
        });

        return { statusCode: 200, body: JSON.stringify({ message: 'Link editado com sucesso!' }) };
    } catch (error) {
        console.error('Erro na função de edição:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao editar o link.' }) };
    }
};