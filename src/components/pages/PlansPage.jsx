import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlans } from "../../queries/billings.queries";
function PlanCardSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">

      <div className="h-8 w-40 rounded bg-slate-200" />

      <div className="mt-4 h-4 w-full rounded bg-slate-200" />
      <div className="mt-2 h-4 w-3/4 rounded bg-slate-200" />

      <div className="mt-8 flex items-end gap-2">
        <div className="h-12 w-24 rounded bg-slate-200" />
        <div className="h-5 w-16 rounded bg-slate-200" />
      </div>

      <div className="mt-5 h-8 w-32 rounded-full bg-slate-200" />

      <div className="mt-8 space-y-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="flex items-center gap-3"
          >
            <div className="h-5 w-5 rounded-full bg-slate-200" />
            <div className="h-4 flex-1 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="mt-8 h-12 rounded-xl bg-slate-200" />

    </div>
  );
}
export default function PlansPage() {
  const navigate = useNavigate();
  const { data, isPending: isLoadingPlans } = usePlans()
  const plans = data?.records ?? []
  const choosePlan = (plan) => {
    navigate(`/recharge?plan_id=${plan.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900">
            Choose Your Plan
          </h1>

          <p className="mt-3 text-slate-500">
            Purchase AI credits and unlock premium AI features.
          </p>
        </div>

        {/* Plans */}
        <div className="mt-12 grid gap-8 lg:grid-cols-3">

          {isLoadingPlans
            ? Array.from({ length: 3 }).map((_, index) => (
              <PlanCardSkeleton key={index} />
            ))
            : plans?.toReversed().map((plan) => (
              <motion.div
                key={plan.id}
                whileHover={{ y: -8 }}
                className={`relative rounded-3xl border bg-white p-7 shadow-sm transition-all ${plan.popular
                  ? "border-blue-500 ring-2 ring-blue-100"
                  : "border-gray-200"
                  }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white shadow">
                    Most Popular
                  </div>
                )}

                <h2 className="text-2xl font-bold">{plan.name}</h2>

                <p className="mt-2 text-sm text-gray-500">
                  {plan.description}
                </p>

                <div className="mt-6">
                  <span className="text-5xl font-bold">
                    ${plan.amount}
                  </span>

                  <span className="text-gray-500"> / plan</span>
                </div>

                <div className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                  {plan.total_credits} Credits
                </div>

                <div className="mt-7 space-y-3">
                  {plan.features?.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-3"
                    >
                      <Check
                        size={18}
                        className="text-green-500"
                      />
                      <span className="text-gray-700">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => choosePlan(plan)}
                  className={`mt-8 w-full rounded-xl py-3 font-semibold transition ${plan.popular
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border border-gray-300 hover:bg-gray-100"
                    }`}
                >
                  Choose Plan
                </button>
              </motion.div>
            ))}

        </div>
      </div>
    </div>
  );
}