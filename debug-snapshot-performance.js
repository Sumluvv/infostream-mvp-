// 详细分析快照性能问题
async function debugSnapshotPerformance() {
  const testUrls = [
    'https://hrss.gd.gov.cn/zwgk/gsgg/index.html',
    'https://www.beams.co.jp/pages/categorylist.aspx',
    'https://www.example.com', // 作为对比
    'https://httpbin.org/delay/1', // 模拟慢速网站
    'https://httpbin.org/delay/2'  // 模拟更慢的网站
  ];
  
  console.log('🔍 开始详细性能分析...\n');
  
  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    console.log(`📊 测试 ${i + 1}/${testUrls.length}: ${url}`);
    console.log('─'.repeat(80));
    
    // 测试1: 直接fetch测试
    console.log('1️⃣ 直接fetch测试:');
    const directStart = Date.now();
    try {
      const directResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; InfoStream/1.0)',
          'Accept': 'text/html',
          'Connection': 'close'
        },
        signal: AbortSignal.timeout(5000)
      });
      const directEnd = Date.now();
      const directTime = directEnd - directStart;
      
      console.log(`   ✅ 状态: ${directResponse.status} ${directResponse.statusText}`);
      console.log(`   ⏱️  耗时: ${directTime}ms`);
      console.log(`   📦 内容长度: ${(await directResponse.text()).length} 字符`);
      
      if (directTime > 2000) {
        console.log(`   ⚠️  网站本身较慢 (${directTime}ms > 2000ms)`);
      } else if (directTime > 1000) {
        console.log(`   ⚠️  网站中等速度 (${directTime}ms > 1000ms)`);
      } else {
        console.log(`   ✅ 网站速度正常 (${directTime}ms < 1000ms)`);
      }
    } catch (error) {
      const directEnd = Date.now();
      const directTime = directEnd - directStart;
      console.log(`   ❌ 直接fetch失败: ${error.message} (${directTime}ms)`);
    }
    
    // 测试2: 通过我们的API测试
    console.log('\n2️⃣ 通过API测试:');
    const apiStart = Date.now();
    try {
      const apiResponse = await fetch('http://localhost:3001/api/feeds/webpage-snapshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ url })
      });
      const apiEnd = Date.now();
      const apiTime = apiEnd - apiStart;
      
      console.log(`   📊 状态: ${apiResponse.status} ${apiResponse.statusText}`);
      console.log(`   ⏱️  总耗时: ${apiTime}ms`);
      
      if (apiResponse.ok) {
        const result = await apiResponse.json();
        console.log(`   📝 标题: ${result.title || '无标题'}`);
        console.log(`   🔗 链接数: ${result.linksCount || 0}`);
        console.log(`   📦 图片大小: ${result.screenshot ? Math.round(result.screenshot.length / 1024) : 0}KB`);
        
        // 分析性能瓶颈
        if (apiTime > 3000) {
          console.log(`   🐌 API响应很慢 (${apiTime}ms > 3000ms) - 可能是网络或服务器问题`);
        } else if (apiTime > 1000) {
          console.log(`   ⚠️  API响应较慢 (${apiTime}ms > 1000ms) - 可能是网站慢或处理慢`);
        } else {
          console.log(`   ✅ API响应正常 (${apiTime}ms < 1000ms)`);
        }
      } else {
        const errorText = await apiResponse.text();
        console.log(`   ❌ API请求失败: ${errorText}`);
      }
    } catch (error) {
      const apiEnd = Date.now();
      const apiTime = apiEnd - apiStart;
      console.log(`   ❌ API请求异常: ${error.message} (${apiTime}ms)`);
    }
    
    // 测试3: 缓存测试（如果API成功）
    console.log('\n3️⃣ 缓存测试:');
    const cacheStart = Date.now();
    try {
      const cacheResponse = await fetch('http://localhost:3001/api/feeds/webpage-snapshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ url })
      });
      const cacheEnd = Date.now();
      const cacheTime = cacheEnd - cacheStart;
      
      console.log(`   ⏱️  缓存耗时: ${cacheTime}ms`);
      
      if (cacheTime < 50) {
        console.log(`   ✅ 缓存命中！响应极快 (${cacheTime}ms < 50ms)`);
      } else if (cacheTime < 200) {
        console.log(`   ⚠️  缓存可能未命中 (${cacheTime}ms > 50ms)`);
      } else {
        console.log(`   ❌ 缓存未生效 (${cacheTime}ms > 200ms)`);
      }
    } catch (error) {
      console.log(`   ❌ 缓存测试失败: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    // 等待1秒再进行下一个测试
    if (i < testUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('🏁 性能分析完成！');
  console.log('\n📋 分析总结:');
  console.log('1. 如果直接fetch很慢，说明目标网站本身有问题');
  console.log('2. 如果API比直接fetch慢很多，说明我们的处理逻辑有问题');
  console.log('3. 如果缓存测试很慢，说明缓存机制有问题');
  console.log('4. 建议优化目标：API响应时间 < 1000ms，缓存响应时间 < 50ms');
}

debugSnapshotPerformance();
