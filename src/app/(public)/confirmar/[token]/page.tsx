import { ConfirmClient } from './ConfirmClient'

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return <ConfirmClient token={token} />
}
