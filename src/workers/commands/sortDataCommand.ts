export async function handleSortData(eventData: any) {
  const { data, prop, order } = eventData

  // shallow copy to prevent mutating the original data
  const result = [...data]

  if (order && prop) {
    result.sort((a: any, b: any) => {
      const valA = a[prop]
      const valB = b[prop]

      if (valA < valB) return order === 'ascending' ? -1 : 1
      if (valA > valB) return order === 'ascending' ? 1 : -1
      return 0
    })
  }

  self.postMessage({
    command: 'sort_data_result',
    status: 'success',
    data: result,
  })
}
