import PropTypes from 'prop-types'

function Header({ title }) {
  return (
    <header className="header">
      <h1>{title}</h1>
      <nav className="nav">
        <a href="#home">Home</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </nav>
    </header>
  )
}

Header.propTypes = {
  title: PropTypes.string.isRequired
}

export default Header