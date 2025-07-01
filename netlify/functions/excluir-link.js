// Arquivo: netlify/functions/excluir-link.js

// O require também foi removido daqui.

const GITHUB_OWNER = 'IUGUVENTAS';
const GITHUB_REPO = 'encurtador-latam';
const FILE_PATH = 'links.json';

exports.handler = async function(event) {
    // A CORREÇÃO ESTÁ AQUI: Usamos o import dinâmico, igual na outra função.
    const { Octokit } = await import("@octokit/rest");

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { id } = JSON.parse(event.body);
        if (!id) {
            return { statusCode: 400, body: 'O ID do link é obrigatório.' };
        }

        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

        const { data: fileData } = await octokit.repos.getContent({
            owner: GITHUB_OWNER, repo: GITHUB_REPO, path: FILE_PATH,
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        let links = JSON.parse(content);
        const fileSha = fileData.sha;

        const linksAtualizados = links.filter(link => link.id !== id);
        if (links.length === linksAtualizados.length) {
             return { statusCode: 404, body: JSON.stringify({ error: 'Link com o ID fornecido não encontrado para exclusão.' }) };
        }

        const updatedFileContent = JSON.stringify(linksAtualizados, null, 2);

        await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER, repo: GITHUB_REPO, path: FILE_PATH,
            message: `[ZedoLink Bot] Exclui link: ${id}`,
            content: Buffer.from(updatedFileContent).toString('base64'),
            sha: fileSha,
        });

        return { statusCode: 200, body: JSON.stringify({ message: 'Link excluído com sucesso!' }) };
    } catch (error) {
        console.error('Erro na função de exclusão:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao excluir o link.' }) };
    }
};