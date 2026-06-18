import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'

type Todo = {
  id: number
  title: string
}

const app = new Hono()
const todos: Todo[] = [
  { id: 1, title: 'Hono server を起動する' },
  { id: 2, title: 'htmx で部分更新する' }
]
let nextTodoId = todos.length + 1

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const renderTodo = (todo: Todo) => `
  <li id="todo-${todo.id}" class="todo-item">
    <span>${escapeHtml(todo.title)}</span>
    <button
      type="button"
      class="ghost-button"
      hx-delete="/todos/${todo.id}"
      hx-target="#todo-${todo.id}"
      hx-swap="outerHTML"
    >
      削除
    </button>
  </li>
`

const renderTodos = () => todos.map(renderTodo).join('')

app.use('/public/*', serveStatic({ root: './' }))

app.get('/', serveStatic({ path: './public/index.html' }))

app.get('/todos', (c) => c.html(renderTodos()))

app.post('/todos', async (c) => {
  const body = await c.req.parseBody()
  const title = String(body.title ?? '').trim()

  if (!title) {
    return c.body(null, 204)
  }

  const todo = { id: nextTodoId++, title }
  todos.push(todo)

  return c.html(renderTodo(todo))
})

app.delete('/todos/:id', (c) => {
  const id = Number(c.req.param('id'))
  const index = todos.findIndex((todo) => todo.id === id)

  if (index !== -1) {
    todos.splice(index, 1)
  }

  return c.body(null, 200)
})

const port = Number(process.env.PORT ?? 3000)

serve({
  fetch: app.fetch,
  port
})

console.log(`Server running at http://localhost:${port}`)
