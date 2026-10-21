import { SAMPLE_ACCOUNTS } from '@/mock/sampleAccounts';

/** Hộp gợi ý tài khoản mẫu, chỉ hiện ở chế độ mock. Bấm vào để điền sẵn email và mật khẩu. */
export function SampleAccounts({ onPick }: { onPick: (email: string, password: string) => void }) {
  return (
    <section
      aria-labelledby="sample-accounts"
      className="mt-6 border-t border-dashed border-rule pt-4"
    >
      <h2 id="sample-accounts" className="font-sans text-sm font-semibold">
        Dùng thử bằng tài khoản mẫu
      </h2>
      <p className="mt-0.5 text-sm text-ink-muted">Bấm để điền sẵn. Mật khẩu là 123456.</p>
      <ul className="mt-3 grid gap-2">
        {SAMPLE_ACCOUNTS.map((account) => (
          <li key={account.email}>
            <button
              type="button"
              onClick={() => onPick(account.email, account.password)}
              className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-control)] border border-rule-strong bg-paper px-3 py-2 text-left text-sm hover:border-ink"
            >
              <span className="font-medium">{account.label}</span>
              <span className="truncate text-ink-muted">{account.email}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
