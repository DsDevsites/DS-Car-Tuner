# DS Car Tuner — Extreme Edition

Aplicativo desktop para Windows voltado à análise e edição controlada de configurações de veículos do Assetto Corsa.

## Funcionalidades atuais

- Interface desktop com Electron, React, TypeScript e Vite.
- Busca automática em pastas comuns do Steam e suporte a escolher a pasta manualmente.
- Listagem de pastas de veículos em `content/cars`.
- Detecção da pasta `data` e do arquivo `data.acd`.
- Inventário e edição com backup de arquivos `.ini` e `.lut`.
- Preparações de potência com metas de 500, 800, 1.000 HP/CV ou valor personalizado, escalando proporcionalmente a curva `power.lut` existente.
- Validação da curva e backup automático antes de aplicar; opção explícita para renomear `data.acd` quando já existe uma pasta `data` descompactada.
- Restrições no processo principal para impedir acesso fora da pasta do veículo.
- O recurso de preparação não extrai nem recompila carros que só tenham `data.acd`; não altera automaticamente câmbio, limitador, embreagem ou suspensão.

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

A edição cria backups antes de gravar. As metas de potência são estimativas matemáticas obtidas da curva de torque e não garantem dirigibilidade nem potência medida no dinamômetro. Teste cada carro em pista e restaure o backup se houver comportamento anormal.
