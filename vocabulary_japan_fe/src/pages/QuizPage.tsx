import { useReducer, useState } from 'react';
import { isApiError } from '@/api/client';
import { QuizQuestion } from '@/components/quiz/QuizQuestion';
import { QuizResult } from '@/components/quiz/QuizResult';
import { QuizSetup } from '@/components/quiz/QuizSetup';
import { QuizSkeleton } from '@/components/quiz/QuizSkeleton';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useStartQuiz, useSubmitQuiz } from '@/hooks/queries/useQuiz';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import type {
  QuizResult as QuizResultData,
  QuizStartRequest,
  QuizStartResponse,
} from '@/types/api';

type QuizState =
  | { step: 'setup' }
  | { step: 'playing'; quiz: QuizStartResponse; index: number; answers: Record<string, string> }
  | { step: 'result'; quiz: QuizStartResponse; result: QuizResultData };

type QuizAction =
  | { type: 'started'; quiz: QuizStartResponse }
  | { type: 'answered'; questionId: string; optionId: string }
  | { type: 'next' }
  | { type: 'finished'; result: QuizResultData }
  | { type: 'reset' };

function reducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'started':
      return { step: 'playing', quiz: action.quiz, index: 0, answers: {} };
    case 'answered':
      if (state.step !== 'playing' || state.answers[action.questionId]) return state;
      return { ...state, answers: { ...state.answers, [action.questionId]: action.optionId } };
    case 'next':
      if (state.step !== 'playing') return state;
      return { ...state, index: Math.min(state.index + 1, state.quiz.questions.length - 1) };
    case 'finished':
      if (state.step !== 'playing') return state;
      return { step: 'result', quiz: state.quiz, result: action.result };
    case 'reset':
      return { step: 'setup' };
  }
}

export default function QuizPage() {
  useDocumentTitle('Quiz');
  const { user } = useAuth();
  const [config, setConfig] = useState<QuizStartRequest>({
    mode: 'jp_vi',
    count: 10,
    level: user?.settings.level ?? 'N5',
  });
  const [state, dispatch] = useReducer(reducer, { step: 'setup' });
  const [setupErrors, setSetupErrors] = useState<{
    fields?: Record<string, string>;
    message: string | null;
  }>({
    message: null,
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const startQuiz = useStartQuiz();
  const submitQuiz = useSubmitQuiz();

  // Đang làm dở (đã bắt đầu, chưa nộp) thì hỏi trước khi rời trang.
  const blocker = useLeaveGuard(state.step === 'playing');

  const start = () => {
    setSetupErrors({ message: null });
    startQuiz.mutate(config, {
      onSuccess: (quiz) => dispatch({ type: 'started', quiz }),
      onError: (error) => {
        if (state.step !== 'setup') dispatch({ type: 'reset' });
        if (isApiError(error) && error.fields)
          setSetupErrors({ fields: error.fields, message: null });
        else
          setSetupErrors({
            message: isApiError(error) ? error.message : 'Chưa soạn được đề. Thử lại nhé.',
          });
      },
    });
  };

  const submit = (quiz: QuizStartResponse, answers: Record<string, string>) => {
    setSubmitError(null);
    submitQuiz.mutate(
      {
        quiz_id: quiz.quiz_id,
        answers: Object.entries(answers).map(([question_id, option_id]) => ({
          question_id,
          option_id,
        })),
      },
      {
        onSuccess: (result) => dispatch({ type: 'finished', result }),
        onError: () =>
          setSubmitError('Chưa nộp được bài. Kiểm tra mạng rồi bấm lại "Xem kết quả".'),
      },
    );
  };

  let content;
  if (startQuiz.isPending && state.step !== 'result') {
    content = <QuizSkeleton />;
  } else if (state.step === 'setup') {
    content = (
      <QuizSetup
        value={config}
        onChange={setConfig}
        onStart={start}
        starting={startQuiz.isPending}
        fieldErrors={setupErrors.fields}
        formError={setupErrors.message}
      />
    );
  } else if (state.step === 'playing') {
    const { quiz, index, answers } = state;
    const question = quiz.questions[index];
    const isLast = index === quiz.questions.length - 1;
    content = question ? (
      <>
        {submitError && (
          <p
            role="alert"
            className="mx-auto mb-4 max-w-[560px] border border-son/40 border-l-[3px] border-l-son bg-son-wash/60 px-3 py-2.5 text-sm font-medium"
          >
            {submitError}
          </p>
        )}
        <QuizQuestion
          question={question}
          mode={config.mode}
          index={index}
          total={quiz.questions.length}
          selectedId={answers[question.id] ?? null}
          onSelect={(optionId) => dispatch({ type: 'answered', questionId: question.id, optionId })}
          onNext={() => (isLast ? submit(quiz, answers) : dispatch({ type: 'next' }))}
          nextLabel={isLast ? 'Xem kết quả' : 'Tiếp'}
          nextLoading={submitQuiz.isPending}
        />
      </>
    ) : null;
  } else {
    content = (
      <QuizResult
        result={state.result}
        questions={state.quiz.questions}
        mode={config.mode}
        onRetry={start}
        retrying={startQuiz.isPending}
        onChangeSetup={() => dispatch({ type: 'reset' })}
      />
    );
  }

  return (
    <>
      {content}
      <Modal
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Rời bài quiz?"
        description="Bài đang làm sẽ không được lưu. Bạn có thể làm lại từ đầu bất cứ lúc nào."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => blocker.proceed?.()}>
              Rời trang
            </Button>
            <Button data-autofocus onClick={() => blocker.reset?.()}>
              Ở lại làm tiếp
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          {state.step === 'playing'
            ? `Bạn đã trả lời ${Object.keys(state.answers).length}/${state.quiz.questions.length} câu.`
            : null}
        </p>
      </Modal>
    </>
  );
}
