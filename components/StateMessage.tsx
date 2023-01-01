import styles from '../styles/Gallery.module.css'

type Props = {
  title: string
  body: string
  action?: { label: string; onClick: () => void }
}

export const StateMessage = ({ title, body, action }: Props) => (
  <div className={styles.stateMessage} role="status">
    <h2>{title}</h2>
    <p>{body}</p>
    {action && (
      <button type="button" className={styles.closeButton} onClick={action.onClick}>
        {action.label}
      </button>
    )}
  </div>
)
