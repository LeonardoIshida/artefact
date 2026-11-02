Backend (tRPC):
○ Modelagem: Cada tarefa deve ter pelo menos os seguintes campos:
■ id (único, pode ser gerado automaticamente)
■ titulo (string, obrigatório)
■ descricao (string, opcional)
■ dataCriacao (timestamp)
○ Operações CRUD: Implemente via tRPC as seguintes operações:
■ Criar Tarefa: Endpoint para adicionar uma nova tarefa.
■ Listar Tarefas: Endpoint para retornar a lista de tarefas.
■ Atualizar Tarefa: Endpoint para editar os dados de uma tarefa
existente.
■ Deletar Tarefa: Endpoint para remover uma tarefa.
○ Validação e Tratamento de Erros: Garanta que:
■ Tarefas não sejam criadas sem título.
■ As operações retornem erros significativos em caso de falha (por
exemplo, tentativa de atualizar uma tarefa inexistente).
