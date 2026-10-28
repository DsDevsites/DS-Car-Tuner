# DS Car Tuner — Extreme Edition

Aplicativo desktop para Windows voltado à análise e edição controlada de configurações de veículos do Assetto Corsa.

## Funcionalidades atuais

- Interface desktop com Electron, React, TypeScript e Vite.
- Busca automática em pastas comuns do Steam e suporte a escolher a pasta manualmente.
- Listagem de pastas de veículos em `content/cars`.
- Detecção da pasta `data` e do arquivo `data.acd`.
- Inventário de arquivos e visualização somente leitura de arquivos `.ini` e `.lut`.
- Restrições no processo principal para impedir leitura fora da pasta do veículo.
- A aplicação ainda não altera arquivos do jogo.

## Requisitos

- Windows 10/11
- Node.js 22 LTS ou uma versão LTS compatível
- npm

## Executar em modo de desenvolvimento

1. Instale Node.js.
2. Clone este repositório.
3. Abra um terminal na pasta do projeto.
4. Execute:

```bash
npm install
npm run electron:dev
```

## Gerar instalador do Windows

```bash
npm install
npm run electron:build
```

O instalador será gerado na pasta `release`, se a compilação terminar corretamente.

## Selecionar a pasta do jogo

Aponte para a pasta principal que contém `content/cars`, normalmente semelhante a:

```text
C:\\Program Files (x86)\\Steam\\steamapps\\common\\assettocorsa
```

Se o jogo estiver em outra biblioteca Steam, use o botão **Selecionar jogo**.

## Estado de desenvolvimento

Esta é a primeira base funcional da interface e do inspetor de arquivos. Os editores de motor, câmbio e física ainda estão em desenvolvimento. O suporte a veículos com apenas `data.acd` exige implementação e testes próprios de extração/recompilação antes de qualquer escrita.

## Proteção dos arquivos

A versão atual só lê arquivos de dados e não oferece gravação. Antes de habilitar edição serão necessários backups automáticos, validação do formato, pré-visualização do diff, confirmação explícita e restauração.
