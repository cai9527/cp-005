interface ForgotPasswordLinkProps {
  onClick?: () => void
  href?: string
  label?: string
}

export default function ForgotPasswordLink({
  onClick,
  href,
  label = '忘记密码?',
}: ForgotPasswordLinkProps) {
  if (href) {
    return (
      <a
        href={href}
        className="text-sm text-accent-primary hover:text-accent-primary/80 transition-colors"
      >
        {label}
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-accent-primary hover:text-accent-primary/80 transition-colors"
    >
      {label}
    </button>
  )
}
