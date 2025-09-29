import { useState } from 'react'
import './App.css'
import Header from './components/Header'
import UserProfile from './components/UserProfile'
import ProductCard from './components/ProductCard'
import TodoList from './components/TodoList'

function App() {
  const [count, setCount] = useState(0)
  const [user] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://via.placeholder.com/64'
  })

  const [products] = useState([
    { id: 1, name: 'MacBook Pro', price: 1299, image: 'https://via.placeholder.com/200x150' },
    { id: 2, name: 'iPhone 15', price: 999, image: 'https://via.placeholder.com/200x150' },
    { id: 3, name: 'AirPods Pro', price: 249, image: 'https://via.placeholder.com/200x150' }
  ])

  return (
    <div className="App">
      <Header title="Claude DevTools Test App" />

      <main className="main-content">
        <section className="counter-section">
          <h2>React Counter Component</h2>
          <div className="counter">
            <button onClick={() => setCount((count) => count - 1)}>
              -
            </button>
            <span className="count-display">{count}</span>
            <button onClick={() => setCount((count) => count + 1)}>
              +
            </button>
          </div>
          <p className="counter-help">
            Click the buttons to test React state updates
          </p>
        </section>

        <section className="user-section">
          <h2>User Profile Block</h2>
          <UserProfile user={user} />
        </section>

        <section className="products-section">
          <h2>Product Cards</h2>
          <div className="products-grid">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={(product) => alert(`Added ${product.name} to cart!`)}
              />
            ))}
          </div>
        </section>

        <section className="todo-section">
          <h2>Todo List Component</h2>
          <TodoList />
        </section>
      </main>
    </div>
  )
}

export default App
