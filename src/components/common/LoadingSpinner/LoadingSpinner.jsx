import { Loader, Center } from '@mantine/core'

export function LoadingSpinner() {
  return (
    <Center style={{ minHeight: 120 }}>
      <Loader color="violet" size="md" />
    </Center>
  )
}
