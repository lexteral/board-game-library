import { useTranslation } from "react-i18next";

export default function BorrowedInfoModal({ game, borrowing, onClose }) {
  const { t } = useTranslation();
  const fmtDate = (d) => d ? d.slice(0, 10) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-violet-200/30 w-full max-w-sm mx-4 p-6 border border-violet-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent mb-4">{t("borrowedInfo.title")}</h2>
        <p className="font-medium text-gray-800 mb-3">{game.name}</p>

        <dl className="text-sm space-y-2">
          <Row label={t("borrowedInfo.borrower")} value={borrowing.borrower_name} />
          <Row label={t("borrowedInfo.studentId")} value={borrowing.borrower_student_id} />
          <Row label={t("borrowedInfo.borrowDate")} value={fmtDate(borrowing.borrow_date)} />
          <Row label={t("borrowedInfo.expectedReturn")} value={fmtDate(borrowing.expected_return_date)} />
        </dl>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {t("borrowedInfo.close")}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium">{value}</dd>
    </div>
  );
}
