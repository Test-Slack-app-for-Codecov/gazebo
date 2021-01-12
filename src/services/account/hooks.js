import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useStripe } from '@stripe/react-stripe-js'

import Api from 'shared/api'

function getPathAccountDetails({ provider, owner }) {
  return `/${provider}/${owner}/account-details/`
}

function fetchAccountDetails({ provider, owner }) {
  const path = getPathAccountDetails({ provider, owner })
  return Api.get({ path, provider })
}

function fetchPlan(provider) {
  const path = `/plans`
  return Api.get({ path, provider })
}

function cancelPlan({ provider, owner }) {
  const path = getPathAccountDetails({ provider, owner })
  const body = {
    plan: {
      value: 'users-free',
    },
  }
  return Api.patch({ path, provider, body })
}

export function useInvoices({ provider, owner }) {
  return useQuery(['invoices', provider, owner], () => {
    const path = `/${provider}/${owner}/invoices/`
    return Api.get({ path, provider })
  })
}

export function useInvoice({ provider, owner, id }) {
  return useQuery(['invoice', provider, owner, id], () => {
    const path = `/${provider}/${owner}/invoices/${id}`
    return Api.get({ path, provider })
  })
}

export function useAccountDetails({ provider, owner }) {
  return useQuery(['accountDetails', provider, owner], () => {
    return fetchAccountDetails({ provider, owner })
  })
}

export function usePlans(provider) {
  // the plans are very static data
  return useQuery('plans', () => fetchPlan(provider), {
    cacheTime: Infinity,
    staleTime: Infinity,
  })
}

export function useCancelPlan({ provider, owner }) {
  const queryClient = useQueryClient()

  return useMutation(() => cancelPlan({ provider, owner }), {
    onSuccess: (data) => {
      // update the local cache of account details from what the server returns
      queryClient.setQueryData(['accountDetails', provider, owner], data)
    },
  })
}

export function useUpgradePlan({ provider, owner }) {
  const stripe = useStripe()
  const queryClient = useQueryClient()

  function redirectToStripe(sessionId) {
    return stripe.redirectToCheckout({ sessionId }).then((e) => {
      // error from Stripe SDK
      return Promise.reject(new Error(e))
    })
  }

  return useMutation(
    (formData) => {
      const path = getPathAccountDetails({ provider, owner })
      const body = {
        plan: {
          quantity: formData.seats,
          value: formData.newPlan.value,
        },
      }
      return Api.patch({ path, provider, body }).then((data) => {
        if (data.checkoutSessionId) {
          // redirect to stripe checkout if there is a checkout session id
          return redirectToStripe(data.checkoutSessionId)
        }

        return data
      })
    },
    {
      onSuccess: (data) => {
        // update the local cache of account details from what the server returns
        queryClient.setQueryData(['accountDetails', provider, owner], data)
      },
    }
  )
}

export function useUpdateCard({ provider, owner }) {
  const stripe = useStripe()
  const queryClient = useQueryClient()

  return useMutation(
    (card) => {
      return stripe
        .createPaymentMethod({
          type: 'card',
          card,
        })
        .then((result) => {
          if (result.error) return Promise.reject(result.error)

          const accountPath = getPathAccountDetails({ provider, owner })
          const path = `${accountPath}update_payment`

          return Api.patch({
            provider,
            path,
            body: { payment_method: result.paymentMethod.id },
          })
        })
    },
    {
      onSuccess: (data) => {
        // update the local cache of account details from what the server returns
        queryClient.setQueryData(['accountDetails', provider, owner], data)
      },
    }
  )
}
