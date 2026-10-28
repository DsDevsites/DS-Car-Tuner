# DS Car Tuner — Extreme Edition

Aplicativo desktop para Windows voltado à análise e edição controlada de configurações de veículos do Assetto Corsa.

## Objetivos da primeira versão

- Detectar a instalação do Assetto Corsa.
- Listar veículos instalados e identificar seus arquivos de configuração.
- Ler arquivos INI e LUT para análise.
- Preparar edições de motor e transmissão com validação e backup.
- Permitir perfis separados e restauração dos arquivos originais.

## Tecnologias planejadas

- Electron
- React
- TypeScript
- Vite
- Node.js

## Segurança

A aplicação deverá trabalhar em modo de leitura por padrão. Alterações só serão gravadas após confirmação explícita, com cópia de segurança e validação. O projeto deve preservar os arquivos originais e não prometer que todo carro/mod permite os mesmos ajustes: veículos podem usar formatos e estruturas diferentes, incluindo dados compactados em `data.acd`.

## Desenvolvimento

O projeto está sendo inicializado. Instruções de instalação e execução serão adicionadas conforme a estrutura executável for implementada.
