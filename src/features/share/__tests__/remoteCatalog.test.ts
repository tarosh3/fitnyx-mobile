import example from '../remote/examples/catalog.json';
import { boundText, imageURL, parseCatalog, type CardBlock } from '../remote/schema';
import type { ShareCardData } from '../cardData';
import { cachedCatalog, refreshCatalog } from '../remote/catalog';
import { fetchWithAuth } from '@/src/lib/api';
import { cacheGetStale, cacheSet } from '@/src/lib/cache/cache';
jest.mock('@/src/lib/api', () => ({ fetchWithAuth: jest.fn(), API_BASE_URL: 'https://api.test/api/v1' }));
jest.mock('@/src/lib/cache/cache', () => ({ cacheGetStale: jest.fn(), cacheSet: jest.fn() }));
const clone = () => JSON.parse(JSON.stringify(example));
const data = { kind:'roam', activityType:'cycle', avgSpeedMps:8, artworkAppearance:'woman', hero:{label:'Distance',value:'24.80',unit:'km'}, title:'Sunset loop' } as ShareCardData;
beforeEach(() => jest.resetAllMocks());
it('accepts both sample designs and an empty publication (remote kill switch)', () => {
  expect(parseCatalog(example)?.templates).toHaveLength(2);
  expect(parseCatalog({schemaVersion:1,revision:2,templates:[]})).not.toBeNull();
});
it.each([
  ['unknown renderer version', (c:any) => c.schemaVersion=2],
  ['duplicate IDs', (c:any) => c.templates.push(c.templates[0])],
  ['missing format', (c:any) => delete c.templates[0].layouts.post],
  ['unknown primitive', (c:any) => c.templates[0].layouts.post.blocks[0].type='webview'],
  ['out of bounds', (c:any) => c.templates[0].layouts.post.blocks[0].x=359],
  ['cropped number', (c:any) => c.templates[0].layouts.post.blocks.find((b:any)=>b.type==='metric').height=10],
  ['missing brand', (c:any) => c.templates[0].layouts.post.blocks=c.templates[0].layouts.post.blocks.filter((b:any)=>b.type!=='brand')],
  ['executable URL', (c:any) => c.templates[0].layouts.post.blocks[3]={type:'image',x:0,y:0,width:100,height:100,url:'javascript:alert(1)'}],
  ['untrusted binding', (c:any) => c.templates[0].layouts.post.blocks[0].binding='user.email'],
  ['non-finite geometry', (c:any) => c.templates[0].layouts.post.blocks[0].width=NaN],
])('rejects %s', (_, mutate) => { const c=clone(); mutate(c); expect(parseCatalog(c)).toBeNull(); });
it('selects the most specific hosted illustration using actual cycling speed and appearance', () => {
 const block:CardBlock={type:'image',x:0,y:0,width:100,height:100,url:'https://cdn.test/default.png',variants:[
  {url:'https://cdn.test/fast.png',subject:'cycle-fast'},
  {url:'https://cdn.test/woman-fast.png',subject:'cycle-fast',appearance:'woman'},
  {url:'https://cdn.test/man.png',appearance:'man'}]};
 expect(imageURL(block,data)).toBe('https://cdn.test/woman-fast.png');
 expect(imageURL(block,{...data,artworkAppearance:'equipment'})).toBe('https://cdn.test/fast.png');
 expect(imageURL(block,{...data,avgSpeedMps:2})).toBe('https://cdn.test/default.png');
 expect(boundText('hero.label',data)).toBe('Distance');
 expect(boundText('fact',data)).toBe('');
});
it('persists a valid publication, including an empty catalog', async () => {
 (fetchWithAuth as jest.Mock).mockResolvedValue({schemaVersion:1,revision:2,templates:[]});
 expect((await refreshCatalog())?.templates).toEqual([]);
 expect(cacheSet).toHaveBeenCalledWith(expect.any(String),{schemaVersion:1,revision:2,templates:[]},0);
});
it('network failure and malformed publications never overwrite the offline catalog', async () => {
 (cacheGetStale as jest.Mock).mockResolvedValue(example);
 (fetchWithAuth as jest.Mock).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({schemaVersion:99});
 expect(await refreshCatalog()).toBeNull(); expect(await refreshCatalog()).toBeNull();
 expect(cacheSet).not.toHaveBeenCalled(); expect(await cachedCatalog()).toEqual(example);
});
it('revalidates cached data before rendering and tolerates disk write failure', async () => {
 (cacheGetStale as jest.Mock).mockResolvedValue({schemaVersion:99});
 expect(await cachedCatalog()).toBeNull();
 (fetchWithAuth as jest.Mock).mockResolvedValue(example);
 (cacheSet as jest.Mock).mockRejectedValue(new Error('disk full'));
 expect(await refreshCatalog()).toEqual(example);
});
