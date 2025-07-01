// Arquivo: netlify/functions/adicionar-link.js

// A linha 'require' foi REMOVIDA daqui para resolver o erro de compatibilidade.

// Informações do seu repositório.
const GITHUB_OWNER = 'IUGUVENTAS'; // Seu usuário do GitHub, já corrigido.
const GITHUB_REPO = 'ENCURTADOR LATAM'; // O nome do seu repositório
const FILE_PATH = 'links-db.js'; // O arquivo que será nosso banco de dados

// A função principal que a Netlify irá executar.
exports.handler = async function(event) {
    // A CORREÇÃO: Importamos a biblioteca dinamicamente aqui dentro.
    const { Octokit } = await import("@octokit/rest");

    // A função só deve aceitar pedidos do tipo POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Pega os dados enviados pelo dashboard (a URL longa a ser encurtada)
        const { url } = JSON.parse(event.body);
        
        // Gera um ID curto e aleatório
        const id = Math.random().toString(36).substring(2, 8);

        // Pega o token seguro que salvamos na Netlify
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

        // Inicia a comunicação com o GitHub
        const octokit = new Octokit({ auth: GITHUB_TOKEN });

        let fileContent = '';
        let fileSha = null;

        try {
            // 1. Tenta pegar o conteúdo atual do arquivo 'links-db.js' no GitHub
            const { data } = await octokit.repos.getContent({
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                path: FILE_PATH,
            });
            // O conteúdo vem codificado em Base64, então precisamos decodificá-lo
            fileContent = Buffer.from(data.content, 'base64').toString('utf8');
            fileSha = data.sha;
        } catch (error) {
            // Se o arquivo não existir (primeira vez que rodamos), ele dará um erro 404.
            // Nesse caso, vamos criar o arquivo do zero.
            if (error.status === 404) {
                fileContent = 'const linksDB = {};';
            } else {
                throw error; // Se for outro erro, nós o relançamos
            }
        }
        
        // 2. Adiciona o novo link ao conteúdo
        // Remove o '};' do final, adiciona a nova linha, e coloca o '};' de volta
        const newEntry = `\n  "${id}": "${url.replace(/"/g, '\\"')}",`;
        const updatedContent = fileContent.slice(0, -2) + newEntry + '\n};';
        
        // 3. Envia o arquivo atualizado de volta para o GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: FILE_PATH,
            message: `[ZedoLink Bot] Adiciona novo link: ${id}`, // Mensagem do commit
            content: Buffer.from(updatedContent).toString('base64'), // Codifica de volta para Base64
            sha: fileSha, // Envia o 'sha' para garantir que estamos atualizando a versão mais recente
        });

        // Retorna uma resposta de sucesso para o nosso dashboard
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Link adicionado com sucesso!', id: id }),
        };

    } catch (error) {
        console.error('Erro na função:', error);
        // Retorna uma resposta de erro
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falha ao adicionar o link.' }),
        };
    }
};