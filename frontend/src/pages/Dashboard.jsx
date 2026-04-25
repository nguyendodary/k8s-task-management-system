import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/index'

function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchTasks()
    fetchUsers()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks')
      setTasks(response.data)
    } catch (err) {
      setError('Failed to fetch tasks')
      console.error('Failed to fetch tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users')
      setUsers(response.data)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return

    try {
      await api.delete(`/tasks/${id}`)
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete task')
    }
  }

  const getUserEmail = (userId) => {
    const user = users.find((u) => u.id === userId)
    return user ? user.email : 'Unassigned'
  }

  const filteredTasks =
    filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="container">
      <h1 style={{ marginBottom: '1.5rem' }}>Dashboard</h1>

      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <label htmlFor="filter-select" style={{ marginRight: '0.5rem' }}>Filter:</label>
          <select id="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <Link to="/tasks/new" className="btn btn-primary">+ New Task</Link>
      </div>

      <div className="task-list">
        {filteredTasks.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: '#7f8c8d' }}>
            No tasks found. Create your first task!
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div key={task.id} className="task-item">
              <div style={{ flex: 1 }}>
                <h3>{task.title}</h3>
                <p style={{ color: '#666', marginBottom: '0.5rem' }}>
                  {task.description || 'No description'}
                </p>
                <div>
                  <span className={`status status-${task.status}`}>
                    {task.status.replace('-', ' ')}
                  </span>
                  <span style={{ marginLeft: '1rem', color: '#666', fontSize: '0.875rem' }}>
                    Assigned to: {task.assigned_email || getUserEmail(task.assigned_to)}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to={`/tasks/${task.id}`} className="btn btn-primary">Edit</Link>
                <button onClick={() => handleDelete(task.id)} className="btn btn-danger">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Dashboard
