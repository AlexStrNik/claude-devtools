import PropTypes from 'prop-types'

function UserProfile({ user }) {
  return (
    <div className="user-profile">
      <img src={user.avatar} alt="User avatar" className="avatar" />
      <div className="user-info">
        <h3>{user.name}</h3>
        <p>{user.email}</p>
        <div className="user-actions">
          <button className="btn-primary">Edit Profile</button>
          <button className="btn-secondary">View Profile</button>
        </div>
      </div>
    </div>
  )
}

UserProfile.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    avatar: PropTypes.string.isRequired
  }).isRequired
}

export default UserProfile