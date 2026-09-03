# Guia de publicação do Cockpit PA (sem programar)

Você faz cliques no Firebase e no GitHub; o resto é automático. Tempo estimado: 15 minutos.

## 1. Criar o projeto no Firebase

1. Abra https://console.firebase.google.com e entre com a conta Google do escritório.
2. Clique em **Criar um projeto** (ou **Adicionar projeto**).
3. Nome: **Cockpit PA**. Avance.
4. Desative o Google Analytics (não é necessário). Clique em **Criar projeto** e depois em **Continuar**.

## 2. Ativar o login

1. No menu esquerdo, abra **Criação > Authentication** e clique em **Vamos começar**.
2. Em **Provedores de login**, clique em **E-mail/senha**, ative a primeira chave e salve.
3. Clique em **Adicionar novo provedor > Google**, ative, escolha o e-mail de suporte e salve.

## 3. Ativar o banco de dados

1. No menu esquerdo, abra **Criação > Firestore Database** e clique em **Criar banco de dados**.
2. Local: **southamerica-east1 (São Paulo)**. Avance.
3. Escolha **Iniciar no modo de produção** e clique em **Criar**. As regras de segurança são publicadas automaticamente depois.

## 4. Registrar o app e me mandar a configuração

1. Volte para **Visão geral do projeto** (casa no topo do menu) e clique no ícone **</>** (Web).
2. Apelido: **Cockpit PA**. Marque **Configurar também o Firebase Hosting**. Clique em **Registrar app**.
3. Vai aparecer um bloco de texto começando com `const firebaseConfig = {`. **Copie esse bloco inteiro e cole no chat comigo.**
4. Clique em **Avançar** até o fim e depois em **Continuar no console**.

## 5. Criar a chave de publicação e guardar no GitHub

1. No Firebase, clique na **engrenagem** ao lado de "Visão geral do projeto" > **Configurações do projeto** > aba **Contas de serviço**.
2. Clique em **Gerar nova chave privada** e depois em **Gerar chave**. Um arquivo `.json` é baixado.
3. Abra https://github.com/jetter-company/JETTSALES/settings/secrets/actions e clique em **New repository secret**.
4. Name: `FIREBASE_SERVICE_ACCOUNT`. Secret: abra o arquivo `.json` no Bloco de Notas, copie tudo e cole. Clique em **Add secret**.

## 6. (Opcional) Chave do Gemini para o assistente

Sem ela o briefing funciona com texto automático; com ela o Atlas escreve com IA e responde perguntas livres.

1. Abra https://aistudio.google.com/apikey e clique em **Criar chave de API**. Escolha o projeto **Cockpit PA**. Copie a chave.
2. No GitHub, no mesmo lugar do passo 5, crie outro segredo: Name `GEMINI_API_KEY`, Secret: a chave copiada.

## 7. Me avisar

Cole no chat o bloco `firebaseConfig` do passo 4 e diga "pronto". Eu gravo a configuração, publico e te mando o endereço do app (algo como `https://cockpit-pa.web.app`).

## Depois de publicado

- Abra o endereço, clique em **Primeiro acesso? Criar conta** e crie a sua conta. O primeiro usuário vira administrador.
- Em **Administração > Equipe > Convidar**, cadastre o e-mail de cada vendedor e do coordenador. Só quem estiver na lista consegue entrar.
- Em **Administração > Dados de exemplo** dá para carregar dados fictícios para treinar e apagar depois.
- No celular, abra o endereço no navegador e use **Adicionar à tela inicial** para instalar como aplicativo.
