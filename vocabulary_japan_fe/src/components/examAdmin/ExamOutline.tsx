import { ArrowDown, ArrowUp, Flag, GripVertical, Plus } from 'lucide-react';
import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import type { AdminExam, ExamOrder, MondaiType } from '@/types/exam';
import { cn } from '@/utils/cn';
import { moveNode, toOrder, type OrderNodeKind } from '@/utils/examOrder';
import { plainText } from '@/utils/markup';

export type Selection =
  | { kind: 'exam' }
  | { kind: 'section'; id: string }
  | { kind: 'mondai'; id: string }
  | { kind: 'passage'; id: string }
  | { kind: 'question'; id: string };

export const selectionKey = (s: Selection) => (s.kind === 'exam' ? 'exam' : `${s.kind}:${s.id}`);

interface DragItem {
  kind: OrderNodeKind;
  id: string;
}

interface OutlineProps {
  exam: AdminExam;
  types: MondaiType[];
  selected: Selection;
  onSelect: (selection: Selection) => void;
  onReorder: (order: ExamOrder) => void;
  onAdd: (what: 'section' | { mondaiIn: string } | { questionIn: string } | { passageIn: string }) => void;
  /** Số lỗi kiểm tra theo câu (id câu → số lỗi), để đánh dấu trên cây. */
  errorCount: Map<string, number>;
  busy: boolean;
}

function Row({
  depth,
  active,
  onClick,
  label,
  meta,
  drag,
  onMove,
  dropHint,
  children,
}: {
  depth: number;
  active: boolean;
  onClick: () => void;
  label: ReactNode;
  meta?: ReactNode;
  drag?: {
    item: DragItem;
    onDragStart: (e: DragEvent, item: DragItem) => void;
    onDragOver: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
  };
  onMove?: { up?: () => void; down?: () => void; label: string };
  dropHint?: boolean;
  children?: ReactNode;
}) {
  return (
    <li>
      <div
        draggable={Boolean(drag)}
        onDragStart={drag ? (e) => drag.onDragStart(e, drag.item) : undefined}
        onDragOver={drag?.onDragOver}
        onDrop={drag?.onDrop}
        className={cn(
          'group flex items-center gap-1 rounded-[4px] pr-1',
          active ? 'bg-son-wash' : 'hover:bg-ink/[0.04]',
          dropHint && 'outline-2 outline-dashed outline-son',
        )}
        style={{ paddingLeft: `${depth * 14}px` }}
      >
        {drag ? (
          <GripVertical aria-hidden="true" className="size-4 shrink-0 cursor-grab text-ink-muted opacity-60 group-hover:opacity-100" />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <button
          type="button"
          onClick={onClick}
          aria-current={active ? 'true' : undefined}
          className={cn('flex min-h-9 min-w-0 flex-1 items-center gap-2 py-1 text-left text-sm', active && 'font-semibold')}
        >
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {meta}
        </button>
        {onMove && (
          <span className="flex opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              onClick={onMove.up}
              disabled={!onMove.up}
              aria-label={`Chuyển ${onMove.label} lên`}
              className="flex size-7 items-center justify-center rounded-[4px] text-ink-muted hover:bg-ink/5 disabled:opacity-30"
            >
              <ArrowUp aria-hidden="true" className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onMove.down}
              disabled={!onMove.down}
              aria-label={`Chuyển ${onMove.label} xuống`}
              className="flex size-7 items-center justify-center rounded-[4px] text-ink-muted hover:bg-ink/5 disabled:opacity-30"
            >
              <ArrowDown aria-hidden="true" className="size-3.5" />
            </button>
          </span>
        )}
      </div>
      {children}
    </li>
  );
}

function AddButton({ depth, onClick, children, disabled }: { depth: number; onClick: () => void; children: string; disabled: boolean }) {
  return (
    <li style={{ paddingLeft: `${depth * 14 + 20}px` }}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex h-8 items-center gap-1 text-xs font-semibold text-son-ink hover:underline disabled:opacity-50"
      >
        <Plus aria-hidden="true" className="size-3.5" />
        {children}
      </button>
    </li>
  );
}

/**
 * Cây đề của trình soạn (FR-CMS-03): phần thi → mondai → bài đọc, câu hỏi. Kéo thả để sắp xếp
 * (được chuyển câu sang mondai khác, mondai sang phần khác), hoặc dùng nút lên/xuống bằng bàn phím.
 * Lọc "chỉ câu gắn cờ" (FR-CMS-15).
 */
export function ExamOutline({ exam, types, selected, onSelect, onReorder, onAdd, errorCount, busy }: OutlineProps) {
  const dragging = useRef<DragItem | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const order = toOrder(exam);
  const typeName = (id: string | null) => types.find((t) => t.id === id)?.name_vi;
  const isSelected = (kind: Selection['kind'], id: string) => selected.kind === kind && 'id' in selected && selected.id === id;
  const flaggedCount = exam.sections.reduce((n, s) => n + s.mondai.reduce((k, m) => k + m.questions.filter((q) => q.needs_review).length, 0), 0);

  const move = (kind: OrderNodeKind, id: string, parentId: string | null, index: number) => {
    const next = moveNode(order, kind, id, parentId, index);
    if (next) onReorder(next);
  };

  /** Chỉ số đích sau khi gỡ nút khỏi chỗ cũ (moveNode tính theo danh sách đã gỡ). */
  const indexBefore = (siblings: string[], dragId: string, targetId: string) =>
    siblings.filter((x) => x !== dragId).indexOf(targetId);

  /**
   * Thả lên một nút cùng loại: chèn vào trước nút đó (`siblings` là danh sách cùng cha của nút
   * đích). Thả câu/bài đọc lên mondai: thêm vào cuối mondai đó.
   */
  const dropOn = (target: DragItem, parentId: string | null, siblings: string[]) => ({
    onDragOver: (e: DragEvent) => {
      const item = dragging.current;
      const ok = item && (item.kind === target.kind || (target.kind === 'mondai' && (item.kind === 'question' || item.kind === 'passage')));
      if (!ok) return;
      e.preventDefault();
      setOver(`${target.kind}:${target.id}`);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setOver(null);
      const item = dragging.current;
      dragging.current = null;
      if (!item || item.id === target.id) return;
      if (target.kind === 'mondai' && item.kind !== 'mondai') {
        const m = order.sections.flatMap((s) => s.mondai).find((x) => x.id === target.id)!;
        move(item.kind, item.id, target.id, (item.kind === 'question' ? m.questions : m.passages).length);
        return;
      }
      move(item.kind, item.id, parentId, indexBefore(siblings, item.id, target.id));
    },
  });
  const onDragStart = (e: DragEvent, item: DragItem) => {
    dragging.current = item;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${item.kind}:${item.id}`);
  };

  return (
    <nav aria-label="Cấu trúc đề" className="flex flex-col gap-2 text-sm" onDragEnd={() => setOver(null)}>
      <label className="flex items-center gap-2 px-1 text-sm">
        <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="size-4" />
        Chỉ câu gắn cờ ({flaggedCount})
      </label>
      <ul className="flex flex-col">
        <Row depth={0} active={selected.kind === 'exam'} onClick={() => onSelect({ kind: 'exam' })} label="Thông tin đề" />
        {exam.sections.map((section, sIndex) => (
          <Row
            key={section.id}
            depth={0}
            active={isSelected('section', section.id)}
            onClick={() => onSelect({ kind: 'section', id: section.id })}
            label={
              <>
                <span className="text-ink-muted">Phần {sIndex + 1} · </span>
                <span lang="ja">{section.title}</span>
              </>
            }
            meta={<span className="shrink-0 text-xs text-ink-muted">{section.duration_minutes ?? '?'}′</span>}
            dropHint={over === `section:${section.id}`}
            drag={{
              item: { kind: 'section', id: section.id },
              onDragStart,
              ...dropOn({ kind: 'section', id: section.id }, null, order.sections.map((s) => s.id)),
            }}
            onMove={{
              label: `phần ${sIndex + 1}`,
              up: sIndex > 0 ? () => move('section', section.id, null, sIndex - 1) : undefined,
              down: sIndex < exam.sections.length - 1 ? () => move('section', section.id, null, sIndex + 1) : undefined,
            }}
          >
            <ul>
              {section.mondai.map((mondai, mIndex) => {
                const questions = flaggedOnly ? mondai.questions.filter((q) => q.needs_review) : mondai.questions;
                if (flaggedOnly && questions.length === 0) return null;
                const mondaiIds = order.sections[sIndex]!.mondai.map((m) => m.id);
                return (
                  <Row
                    key={mondai.id}
                    depth={1}
                    active={isSelected('mondai', mondai.id)}
                    onClick={() => onSelect({ kind: 'mondai', id: mondai.id })}
                    label={
                      <>
                        <span lang="ja">問題{mondai.number}</span>
                        <span className="text-ink-muted"> · {typeName(mondai.type_id) ?? 'chưa chọn dạng'}</span>
                      </>
                    }
                    meta={<span className="shrink-0 text-xs tabular-nums text-ink-muted">{mondai.questions.length}</span>}
                    dropHint={over === `mondai:${mondai.id}`}
                    drag={{
                      item: { kind: 'mondai', id: mondai.id },
                      onDragStart,
                      ...dropOn({ kind: 'mondai', id: mondai.id }, section.id, mondaiIds),
                    }}
                    onMove={{
                      label: `問題${mondai.number}`,
                      up: mIndex > 0 ? () => move('mondai', mondai.id, section.id, mIndex - 1) : undefined,
                      down: mIndex < section.mondai.length - 1 ? () => move('mondai', mondai.id, section.id, mIndex + 1) : undefined,
                    }}
                  >
                    <ul>
                      {!flaggedOnly &&
                        mondai.passages.map((passage, pIndex) => (
                          <Row
                            key={passage.id}
                            depth={2}
                            active={isSelected('passage', passage.id)}
                            onClick={() => onSelect({ kind: 'passage', id: passage.id })}
                            label={<span className="italic">Bài đọc {passage.label || pIndex + 1}</span>}
                            dropHint={over === `passage:${passage.id}`}
                            drag={{
                              item: { kind: 'passage', id: passage.id },
                              onDragStart,
                              ...dropOn({ kind: 'passage', id: passage.id }, mondai.id, mondai.passages.map((p) => p.id)),
                            }}
                            onMove={{
                              label: `bài đọc ${pIndex + 1}`,
                              up: pIndex > 0 ? () => move('passage', passage.id, mondai.id, pIndex - 1) : undefined,
                              down:
                                pIndex < mondai.passages.length - 1 ? () => move('passage', passage.id, mondai.id, pIndex + 1) : undefined,
                            }}
                          />
                        ))}
                      {questions.map((question) => {
                        const qIndex = mondai.questions.indexOf(question);
                        const errors = errorCount.get(question.id) ?? 0;
                        const text =
                          question.kind === 'star'
                            ? `★ ${plainText(question.star_prefix)}…${plainText(question.star_suffix)}`
                            : plainText(question.prompt) || '(điền vào bài đọc)';
                        return (
                          <Row
                            key={question.id}
                            depth={2}
                            active={isSelected('question', question.id)}
                            onClick={() => onSelect({ kind: 'question', id: question.id })}
                            label={
                              <>
                                <span className="font-semibold tabular-nums">{question.number}.</span>{' '}
                                <span lang="ja" className="text-ink-muted">
                                  {text}
                                </span>
                              </>
                            }
                            meta={
                              <>
                                {question.needs_review && <Flag aria-label="Cần xem lại" className="size-3.5 shrink-0 fill-son text-son" />}
                                {errors > 0 && (
                                  <span className="shrink-0 bg-son px-1 text-[10px] font-bold text-on-son" title={`${errors} lỗi`}>
                                    {errors}
                                  </span>
                                )}
                              </>
                            }
                            dropHint={over === `question:${question.id}`}
                            drag={
                              flaggedOnly
                                ? undefined
                                : {
                                    item: { kind: 'question', id: question.id },
                                    onDragStart,
                                    ...dropOn({ kind: 'question', id: question.id }, mondai.id, mondai.questions.map((q) => q.id)),
                                  }
                            }
                            onMove={
                              flaggedOnly
                                ? undefined
                                : {
                                    label: `câu ${question.number}`,
                                    up: qIndex > 0 ? () => move('question', question.id, mondai.id, qIndex - 1) : undefined,
                                    down:
                                      qIndex < mondai.questions.length - 1
                                        ? () => move('question', question.id, mondai.id, qIndex + 1)
                                        : undefined,
                                  }
                            }
                          />
                        );
                      })}
                      {!flaggedOnly && (
                        <>
                          <AddButton depth={2} onClick={() => onAdd({ questionIn: mondai.id })} disabled={busy}>
                            Thêm câu
                          </AddButton>
                          <AddButton depth={2} onClick={() => onAdd({ passageIn: mondai.id })} disabled={busy}>
                            Thêm bài đọc
                          </AddButton>
                        </>
                      )}
                    </ul>
                  </Row>
                );
              })}
              {!flaggedOnly && (
                <AddButton depth={1} onClick={() => onAdd({ mondaiIn: section.id })} disabled={busy}>
                  Thêm mondai
                </AddButton>
              )}
            </ul>
          </Row>
        ))}
        {!flaggedOnly && (
          <AddButton depth={0} onClick={() => onAdd('section')} disabled={busy}>
            Thêm phần thi
          </AddButton>
        )}
      </ul>
    </nav>
  );
}
