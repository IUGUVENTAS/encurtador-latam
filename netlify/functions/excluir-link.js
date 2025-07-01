// Arquivo: netlify/functions/excluir-link.js

const { Octokit } = require("@octokit/rest");

const GITHUB_OWNER = 'IUGUVENTAS';
const GITHUB_REPO = 'encurtador-latam';
const FILE_PATH = 'links.json';

exports.handler = async function(event) {
    const { Octokit } = await import("@octokit/rest");

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Pega o ID do link a ser excluído
        const { id } = JSON.parse(event.body);

        if (!id) {
            return { statusCode: 400, body: 'O ID do link é obrigatório.' };
        }

        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

        // Pega o conteúdo atual do arquivo 'links.json'
        const { data: fileData } = await octokit.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: FILE_PATH,
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        let links = JSON.parse(content);
        const fileSha = fileData.sha;

        // Cria um NOVO array contendo todos os links, EXCETO aquele com o ID que queremos excluir
        const linksAtualizados = links.filter(link => link.id !== id);
        
        // Verifica se algum link foi realmente removido
        if (links.length === linksAtualizados.length) {
             return { statusCode: 404, body: JSON.stringify({ error: 'Link com o ID fornecido não encontrado para exclusão.' }) };
        }

        // Prepara o novo conteúdo para enviar de volta ao GitHub
        const updatedFileContent = JSON.stringify(linksAtualizados, null, 2);

        // Envia o arquivo atualizado (sem o link excluído)
        await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: FILE_PATH,
            message: `[ZedoLink Bot] Exclui link: ${id}`,
            content: Buffer.from(updatedFileContent).toString('base64'),
            sha: fileSha,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Link excluído com sucesso!' }),
        };

    } catch (error) {
        console.error('Erro na função de exclusão:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao excluir o link.' }) };
    }
};