import { Checkbox, SegmentedControl } from '@mantine/core'
import { Card } from '@/components/ui/Card/Card'
import { Input } from '@/components/ui/Input/Input'
import { Button } from '@/components/ui/Button/Button'
import { Money } from '@/components/ui/Money/Money'
import { Skeleton } from '@/components/common/Skeleton/Skeleton'
import { todayISO, initialCentsOf } from '@/lib/simulation/scenarioModel'
import { fromCents } from '@/lib/simulation/money'
import styles from './Builder.module.css'

// La ayuda va debajo del campo para que las cajas queden alineadas.
const BELOW_HINT = ['label', 'input', 'description', 'error']

const BALANCE_MODES = [
  { value: 'manual',   label: 'Monto manual' },
  { value: 'accounts', label: 'Mis cuentas'  },
]

// Foto de los saldos actuales de las cuentas elegidas. Es una copia: si luego
// cambian las cuentas reales, el escenario no se mueve hasta "Actualizar".
const snapshot = (accounts, ids) => accounts
  .filter((a) => ids.includes(a.id))
  .map((a) => ({ accountId: a.id, name: a.name, amount: String(a.balance) }))

export function ScenarioConfig({ config, accounts, loading = false, onChange }) {
  const selectedIds = config.accountBalances.map((a) => a.accountId)
  const today = todayISO()

  function setMode(mode) {
    if (mode === 'accounts' && config.accountBalances.length === 0) {
      // Por defecto, las cuentas de uso diario (no las de ahorro).
      const ids = accounts.filter((a) => !a.is_savings).map((a) => a.id)
      onChange({ balanceMode: mode, accountBalances: snapshot(accounts, ids.length ? ids : accounts.map((a) => a.id)) })
      return
    }
    onChange({ balanceMode: mode })
  }

  function toggleAccount(id) {
    const ids = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    onChange({ accountBalances: snapshot(accounts, ids) })
  }

  const isAccounts = config.balanceMode === 'accounts'

  return (
    <Card className={styles.configCard}>
      <div className={styles.configGrid}>
        <div className={styles.balanceField}>
          <div className={styles.fieldHead}>
            <span className={styles.fieldLabel} id="sim-balance-label">Saldo inicial</span>
            <SegmentedControl
              size="xs"
              value={config.balanceMode}
              onChange={setMode}
              data={BALANCE_MODES}
              aria-labelledby="sim-balance-label"
              disabled={accounts.length === 0}
            />
          </div>

          {isAccounts && loading && accounts.length === 0 && (
            <div className={styles.accountList}>
              <Skeleton style={{ height: 36 }} />
              <Skeleton style={{ height: 36 }} />
            </div>
          )}
          {isAccounts && !(loading && accounts.length === 0) ? (
            <div className={styles.accountList}>
              {accounts.map((a) => {
                const checked = selectedIds.includes(a.id)
                return (
                  <label key={a.id} className={styles.accountRow}>
                    <Checkbox checked={checked} onChange={() => toggleAccount(a.id)} size="sm" aria-label={`Incluir ${a.name}`} />
                    <span className={styles.accountDot} style={{ background: a.color }} aria-hidden="true" />
                    <span className={styles.accountName}>{a.name}{a.is_savings ? ' · ahorro' : ''}</span>
                    <Money value={a.balance} className={styles.accountAmount} />
                  </label>
                )
              })}
              <div className={styles.accountTotal}>
                <span>Total de partida</span>
                <Money value={fromCents(initialCentsOf(config))} />
              </div>
              <Button variant="ghost" size="sm" onClick={() => onChange({ accountBalances: snapshot(accounts, selectedIds) })}>
                Actualizar con saldos actuales
              </Button>
            </div>
          ) : !isAccounts && (
            <Input
              aria-labelledby="sim-balance-label"
              type="number"
              step="0.01"
              prefix="S/"
              placeholder="0.00"
              value={config.initialBalance}
              onChange={(e) => onChange({ initialBalance: e.target.value })}
              hint="Lo que tienes disponible hoy para gastar"
              inputWrapperOrder={BELOW_HINT}
              classNames={{ input: styles.bigInput }}
            />
          )}
        </div>

        <div className={styles.inlineFields}>
          <div className={styles.dateField}>
            <Input
              label="Inicio de la simulación"
              type="date"
              value={config.startDate}
              onChange={(e) => e.target.value && onChange({ startDate: e.target.value })}
            />
            {config.startDate !== today && (
              <Button variant="ghost" size="sm" onClick={() => onChange({ startDate: today })}>Hoy</Button>
            )}
          </div>
          <Input
            label="Saldo mínimo deseado"
            type="number"
            min="0"
            step="0.01"
            prefix="S/"
            placeholder="0.00"
            value={config.threshold}
            onChange={(e) => onChange({ threshold: e.target.value })}
            hint="Te avisamos si la proyección baja de aquí"
            inputWrapperOrder={BELOW_HINT}
          />
        </div>
      </div>
    </Card>
  )
}
