interface Context {
  request: Request
  waitUntil: (promise: Promise<any>) => void
}

export async function onRequest(context: Context) {
  const { request } = context
  const url = new URL(request.url)

  const type = url.searchParams.get('type')
  let version = url.searchParams.get('version') || 'latest'
  const lang = url.searchParams.get('lang') || 'en'

  if (!type) {
    return new Response('Missing type parameter', { status: 400 })
  }

  const cache = (caches as any).default

  if (version === 'latest') {
    const branchCacheKey = new Request(
      'https://wuwa.realnath.my.id/internal-cache/default-branch',
      request,
    )
    let branchResponse = await cache.match(branchCacheKey)

    if (!branchResponse) {
      const gitRes = await fetch('https://api.github.com/repos/Arikatsu/WutheringWaves_Data', {
        headers: { 'User-Agent': 'Cloudflare-Worker' },
      })
      if (gitRes.ok) {
        const data = await gitRes.json()
        version = data.default_branch
        // Cache the default branch name for 1 hour to prevent rate limiting
        branchResponse = new Response(version, { headers: { 'Cache-Control': 's-maxage=3600' } })
        context.waitUntil(cache.put(branchCacheKey, branchResponse.clone()))
      } else {
        return new Response('Failed to fetch default branch', { status: 500 })
      }
    } else {
      version = await branchResponse.text()
    }
  }

  let githubUrl = ''
  if (type.toLowerCase() === 'multitext') {
    githubUrl = `https://raw.githubusercontent.com/Arikatsu/WutheringWaves_Data/refs/heads/${version}/Textmaps/${lang}/multi_text/MultiText.json`
  } else if (type.toLowerCase() === 'multitext_1sthalf') {
    githubUrl = `https://raw.githubusercontent.com/Arikatsu/WutheringWaves_Data/refs/heads/${version}/Textmaps/${lang}/multi_text_1sthalf/MultiText.json`
  } else if (type.toLowerCase() === 'multitext_2ndhalf') {
    githubUrl = `https://raw.githubusercontent.com/Arikatsu/WutheringWaves_Data/refs/heads/${version}/Textmaps/${lang}/multi_text_2ndhalf/MultiText.json`
  } else if (type.toLowerCase() === 'flowstate') {
    githubUrl = `https://raw.githubusercontent.com/Arikatsu/WutheringWaves_Data/refs/heads/${version}/BinData/flowState/flowstate.json`
  } else if (type.toLowerCase() === 'plothandbook') {
    githubUrl = `https://raw.githubusercontent.com/Arikatsu/WutheringWaves_Data/refs/heads/${version}/BinData/PlotHandBook/plothandbookconfig.json`
  } else {
    return new Response(`Unsupported type: ${type}`, { status: 400 })
  }

  // Check Cloudflare Edge Cache for the actual JSON data
  const dataCacheKey = new Request(githubUrl, request)
  let response = await cache.match(dataCacheKey)

  if (!response) {
    // Cache miss, fetch from GitHub
    response = await fetch(githubUrl)

    if (!response.ok) {
      return new Response(`Failed to fetch from GitHub: ${response.statusText}`, {
        status: response.status,
      })
    }

    // Clone response to modify headers
    response = new Response(response.body, response)

    // Cache JSON files globally on Cloudflare Edge for 24 hours (86400 seconds)
    response.headers.set('Cache-Control', 's-maxage=86400')
    response.headers.set('Access-Control-Allow-Origin', '*')

    // Put it in cache asynchronously so it doesn't block the user's request
    context.waitUntil(cache.put(dataCacheKey, response.clone()))
  }

  return response
}
