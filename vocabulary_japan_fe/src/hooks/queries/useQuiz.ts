import { useMutation } from '@tanstack/react-query';
import { quizApi } from '@/api/quizApi';

/** POST /quiz/start. Quiz không đổi dữ liệu SRS nên không cần invalidate gì. */
export function useStartQuiz() {
  return useMutation({ mutationFn: quizApi.start });
}

/** POST /quiz/submit */
export function useSubmitQuiz() {
  return useMutation({ mutationFn: quizApi.submit });
}
