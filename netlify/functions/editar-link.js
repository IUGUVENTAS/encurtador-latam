// Arquivo: netlify/functions/editar-link.js

const { Octokit } = require("@octokit/rest");

const GITHUB_OWNER = 'IUGUVENTAS';
const GITHUB_REPO = 'encurtador-latam';
const FILE_PATH = 'links.json';

exports.handler = async function(event) {
    // A linha de importação dinâmica para compatibilidade
    const { Octokit } = await import("@octokit/rest");

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Pega o ID do link e a NOVA URL enviados pelo dashboard
        const { id, newUrl } = JSON.parse(event.body);

        if (!id || !newUrl) {
            return { statusCode: 400, body: 'ID do link e nova URL são obrigatórios.' };
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

        // Encontra o índice do link que queremos editar
        const linkIndex = links.findIndex(link => link.id === id);

        if (linkIndex === -1) {
            // Se não encontrar o link, retorna um erro
            return { statusCode: 404, body: JSON.stringify({ error: 'Link com o ID fornecido não encontrado.' }) };
        }

        // Atualiza a URL original do link encontrado
        links[linkIndex].original = newUrl;

        // Prepara o conteúdo atualizado para enviar de volta ao GitHub
        const updatedFileContent = JSON.stringify(links, null, 2);

        // Envia o arquivo atualizado
        await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: FILE_PATH,
            message: `[ZedoLink Bot] Edita link: ${id}`,
            content: Buffer.from(updatedFileContent).toString('base64'),
            sha: fileSha,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Link editado com sucesso!' }),
        };

    } catch (error) {
        console.error('Erro na função de edição:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao editar o link.' }) };
    }
};