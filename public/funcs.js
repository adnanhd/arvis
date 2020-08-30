    // import NeoVis from '~/node_modules/neovis.js/src/neovis.js';
    // import NeoVis from 'neovis.js/dist/neovis.js';

    var viz;
    var clickedNodes={};
    var clickCount = 0;
    var nodes =  {};
    var edges =  {};
    var allNodes = {};
    var allEdges = {};
    var year;
    var month;
    var day;
    var fetched=false;
    var clickedNodesID;
    var currentStartDate;
    var currentEndDate;
    var dateChanged=false;
    var clickedNewsNodes=[];
    var recData = [];
    var initQuery;
    var defaultQuery = "MATCH (a:News)   RETURN *"
    var defaultQueryWithExclusion = "MATCH (a:News) WHERE a.category<>\"son-dakika\" and a.category<>\"social-media\"  RETURN *"


    function addHtmlELement(infoMessage,innerMessage="",htmlElement){
        if(htmlElement=="strong"){
            infoMessage+="<"+htmlElement+">"+innerMessage+"</"+htmlElement+">";
        }

        return infoMessage;
    }

    function findTheValue(msg,element){
        var value="";
        var startPos = msg.indexOf(element)+element.length+":</strong> ".length;
        var endPos = msg.indexOf("<br>",startPos);
        return msg.substring(startPos,endPos);
    }

    function infoDisplayMessage(msg,type){
        var infoMessage="";
        if(type=="entity"){
            // //ids
            // infoMessage=addHtmlELement(infoMessage,"News IDs:","strong");
            // //to eliminate duplicates:
            // let idsString = findTheValue(msg,"Nid");
            // let ids = idsString.split(",");
            // let idSet = new Set();
            // for(i=0;i<ids.length;i++){
            //     idSet.add(ids[i]);
            // };
            // let idsMessage = Array.from(idSet).join(",");
            // infoMessage+=idsMessage;
            // infoMessage+="<br>";
            
            //type
            infoMessage=addHtmlELement(infoMessage,"Type:","strong");
            infoMessage+=findTheValue(msg,"Type");
            infoMessage+="<br>";

            // Date
            infoMessage=addHtmlELement(infoMessage,"Date:","strong");
            infoMessage+=findTheValue(msg,"Date");
            infoMessage+="<br>";

            //Name
            infoMessage=addHtmlELement(infoMessage,"Name:","strong");
            infoMessage+=findTheValue(msg,"Name");
            infoMessage+="<br>";

        }
        else if(type=="news"){
            //News ID
            infoMessage=addHtmlELement(infoMessage,"News ID:","strong");
            infoMessage+=findTheValue(msg,"Nid");
            infoMessage+="<br>";

            //Category
            infoMessage=addHtmlELement(infoMessage,"Category:","strong");
            infoMessage+=findTheValue(msg,"category");
            infoMessage+="<br>";

            //Relationship number
            infoMessage=addHtmlELement(infoMessage,"Relationship Count:","strong");
            var count = findTheValue(msg,"EnCount");
            if(isNaN(count)){
                count=0;
            }
            infoMessage+=count;
            infoMessage+="<br>";

            // Date
            infoMessage=addHtmlELement(infoMessage,"Date:","strong");
            infoMessage+=findTheValue(msg,"Date");
            infoMessage+="<br>";

            //did not add the url to add it as a anchor tag
            infoMessage=addHtmlELement(infoMessage,"URL:","strong");
            infoMessage+="<br>";



        }

        return infoMessage;

    }

    async function  draw() {
        let d = new Date();
         year = ""+d.getFullYear();
        if(d.getMonth()<9){
            month="0"+(d.getMonth()+1);
        }
        else{
            month=""+d.getMonth()+1;
        }
        day =d.getDate();
        if(day<10){
            day="0"+day;
        }
        else{
            day=""+day;
        }
        currentStartDate=year+"-"+month+"-"+day;
        currentEndDate=currentStartDate;
        document.getElementById("startDate").value=currentStartDate;
        document.getElementById("endDate").value=currentEndDate;
        currentStartDate="\""+currentStartDate+"\"";
        currentEndDate=currentStartDate;
        initQuery = alterQuery(defaultQueryWithExclusion,"WHERE","a.Date>="+currentStartDate);
        initQuery = alterQuery(initQuery,"WHERE","a.Date<="+currentEndDate);
        // initQuery=alterQuery(initQuery,"WHERE","a.category<>\"son-dakika\"" );
        var config = {
            container_id: "viz",
            server_url: "bolt://144.122.71.70:8082",
            server_user: "neo4j",
            server_password: "neo4j%nevis",
            labels: {
                "News":{
                    "caption":"Nid",
                    "community":"category",
                    "size":"EnCount"
                },
                "Entity":{
                    "caption":"Name",
                    "community":"Type"
                }
            },
            relationships: {
                
            },
            initial_cypher:initQuery
        };
        
        viz = new NeoVis.default(config);



        
        await viz.renderPromise(initQuery);
        

        addClickEvent();


    }

    async function addClickEvent(){

        if(!fetched || dateChanged){
            fetched=true;
            await fetchAllData("withRelations");
            await fetchAllData("noRelations");
            
        }
        dateChanged=false;
        viz._network.on("click",async params=>{
            if(params.nodes.length==0){
                //user did not clicked a node
            }
            else{
                document.getElementById("object-content").style.visibility = "visible";
                id=params.nodes[0];
                clickedNodesID=id;
                var node = allNodes[id];
                var title = "";
                try {
                    title=node.title;
                } catch (error) {
                    //no entity situation
                    console.log("no title");
                }
                var name=allNodes[id].label;
                var type = allNodes[id].group;
                var infoDisplay = document.getElementById("clicked-data");
                var urlTag=document.getElementById('url');
                var wikiInfo=document.getElementById('wikiInfo');

                var clickedNewsIndex = clickedNewsNodes.indexOf(id);
                
                if(clickedNewsIndex>-1){ //it is already clicked thus undo
                    clickedNewsID = clickedNewsNodes[clickedNewsIndex];
                    //delete it from clicked news nodes
                    clickedNewsNodes.splice(clickedNewsIndex,1);
                        for(const i in allEdges){
                            if(allEdges[i].from==id){
                                let theEdge = allEdges[i];
                                try{
                                    viz._data["edges"].remove(theEdge);
                                    viz._data["nodes"].remove(allNodes[theEdge.to])
                                }
                                catch(err){
                                    //the error is because the node or edge is already exists
                                }
                            }
                        }
                        viz._network.redraw();
                        return;
                }
                

                
                if(title.includes("http")){ // news news node is clicked
                    clickedNewsNodes.push(id);
                    //first change the graph
                    for(const i in allEdges){
                        if(allEdges[i].from==id){
                            let newEdge = allEdges[i];
                            try{
                                viz._data["edges"].add(newEdge);
                                viz._data["nodes"].add(allNodes[newEdge.to])
                            }
                            catch(err){
                                //the error is because the node or edge is already exists
                            }
                        }
                    }
                    viz._network.redraw();

                    //then display the info
                    let info = infoDisplayMessage(title,"news");
                    infoDisplay.innerHTML=info;
                    if(title.includes("SourceURL")){
                        //son dakika
                        let urlStart=title.indexOf("SourceURL:</strong> ")+ "SourceURL:</strong> ".length;
                        let urlEnd = title.indexOf("<br>",urlStart);
                        let url = title.slice(urlStart,urlEnd);

                        urlTag.href=url;
                        urlTag.innerHTML=url;
                        wikiInfo.innerHTML="";
                        
                    }
                    else{
                        let namePos=title.indexOf("Name:</strong> ")+ "Name:</strong> ".length;
                        let endVar = title.lastIndexOf("<br>");
                        let url = title.slice(namePos,endVar);
                        urlTag.href=url;
                        urlTag.innerHTML=url;
                        wikiInfo.innerHTML="";
                    }

                }
                else{ //entity node is clicked 
                    urlTag.innerHTML="";
                    
                    let info = infoDisplayMessage(title,"entity");
                    infoDisplay.innerHTML=info;

                    if(type=="PERSON" || type=="LOCATION" || type=="ORGANIZATION"){
                        // EKSIKLER FIXED...
                        name = mainWiki(name);
                    }
                    else{
                        wikiInfo.innerHTML="";
                    }

                    // like std:map
                    if(clickedNodes.hasOwnProperty(title)){
                        clickedNodes[title]=clickedNodes[title]+1;
                    }
                    else{
                        clickedNodes[title]=1;
                    }
                    clickCount++;

                    var recommendationDisplay = document.getElementById("recommendation-display");
                    var recommendationMessage = document.getElementById("recommendation-message");
                    var newsUL=document.getElementById("news-recommendations");

                    
                    if(clickCount%5==0){

                        //remove earlier recommendations
                        var child = newsUL.firstChild;
                        while (child) { 
                            newsUL.removeChild(child); 
                            child = newsUL.lastElementChild; 
                        }
                        //finding the most clicked entity

                        // for(const key in clickedNodes){
                        //     if(clickedNodes[key]>max){
                        //         max = clickedNodes[key];
                        //         entity = key;
                        //     }
                        //}

                        var sortedClickedNodes =[];
                        for (var nodes in clickedNodes) {
                            sortedClickedNodes.push([nodes, clickedNodes[nodes]]);
                        }
                        
                        sortedClickedNodes.sort(function(a, b) {
                            return b[1] - a[1];
                        });

                        var firstNumber=secondNumber=thirdNumber=0;
                        var firstEntity=secondEntity=thirdEntity=firstEntityName=secondEntityName=thirdEntityName="";

                        try{
                            firstNumber=sortedClickedNodes[0][1]
                            firstEntity=sortedClickedNodes[0][0];
                        }
                        catch{

                        }

                        try {
                            secondNumber=sortedClickedNodes[1][1]
                            secondEntity=sortedClickedNodes[1][0];
                        } catch (error) {
                            
                        }

                        try {
                            thirdNumber=sortedClickedNodes[2][1]
                            thirdEntity=sortedClickedNodes[2][0];
                        } catch (error) {
                            
                        }
                        var nameStart=nameEnd="";

                        //getting the related ids of the most clicked entity
                        if(firstEntity!=""){
                            nameStart = firstEntity.search("Name:</strong> ")+15;
                            nameEnd = firstEntity.length-4;
                            firstEntityName = firstEntity.slice(nameStart,nameEnd);
                        }

                        if(secondEntity!=""){
                            nameStart=secondEntity.search("Name:</strong> ")+15;
                            nameEnd = secondEntity.length-4;
                            secondEntityName = secondEntity.slice(nameStart,nameEnd);
                        }

                        if(thirdEntity!=""){
                            nameStart=thirdEntity.search("Name:</strong> ")+15;
                            nameEnd = thirdEntity.length-4;
                            thirdEntityName = thirdEntity.slice(nameStart,nameEnd);
                        }
                        
                        

                       
                        var recommendationQuery = "MATCH (a:News)-[r]-(b:Entity),(n:News)-[x]-(e:Entity),(p:News)-[t]-(q:Entity) WHERE  a.Date>\"2020-05-19\" and a.Nid=n.Nid and a.Nid=p.Nid  and (a.Date>"+currentEndDate+" OR a.Date<"+currentStartDate+")  and (n.Date=a.Date) and (p.Date=a.Date)  and b.Name="+"\""+firstEntityName+"\"  and ( e.Name="+"\""+secondEntityName+"\" AND q.Name="+"\""+thirdEntityName+"\" )  "  + " RETURN a.Nid";

                        if(secondEntityName=="" && thirdEntityName==""){
                            recommendationQuery="MATCH (a:News)-[r]-(b:Entity),(n:News)-[x]-(e:Entity) WHERE a.Date>\"2020-05-19\" and  a.Nid=n.Nid  and (a.Date>"+currentEndDate+" OR a.Date<"+currentStartDate+")  and (n.Date=a.Date)  and b.Name="+"\""+firstEntityName+"\" "  + " RETURN a.Nid";
                            await recommendationFetching(recommendationQuery);
                        }
                        else if(secondEntityName != "" && thirdEntityName==""){
                            recommendationQuery="MATCH (a:News)-[r]-(b:Entity),(n:News)-[x]-(e:Entity) WHERE a.Date>\"2020-05-19\" and  a.Nid=n.Nid  and (a.Date>"+currentEndDate+" OR a.Date<"+currentStartDate+")  and (n.Date=a.Date)  and b.Name="+"\""+firstEntityName+"\"  and ( e.Name="+"\""+secondEntityName+"\" ) "  + " RETURN a.Nid";
                            await recommendationFetching(recommendationQuery);
                        }
                        else{                            
                            await recommendationFetching(recommendationQuery);
                            if(recData.length==0){
                                recommendationQuery = "MATCH (a:News)-[r]-(b:Entity),(n:News)-[x]-(e:Entity) WHERE  a.Date>\"2020-05-19\" and a.Nid=n.Nid  and (a.Date>"+currentEndDate+" OR a.Date<"+currentStartDate+")  and (n.Date=a.Date)  and b.Name="+"\""+firstEntityName+"\"  and ( e.Name="+"\""+secondEntityName+"\" OR e.Name="+"\""+thirdEntityName+"\" )  "  + " RETURN a.Nid";
                                await recommendationFetching(recommendationQuery);
                            }
                        }

                        if(recData.length==0){

                            var recommendationQuery = "MATCH (a:News)-[r]-(b:Entity),(n:News)-[x]-(e:Entity) WHERE a.Date>\"2020-05-19\" and  a.Nid=n.Nid  and (a.Date>"+currentEndDate+" OR a.Date<"+currentStartDate+") and (n.Date=a.Date)  and b.Name="+"\""+firstEntityName+"\" "  + " RETURN a.Nid";
                            await recommendationFetching(recommendationQuery);

                            if(recData.length!=0){
                                recommendationMessage.innerHTML="Because you clicked:" ;
                                recommendationMessage.innerHTML+="<br> \""+firstEntityName+"\" "+ firstNumber+ " times";
                                recommendationMessage.innerHTML+="<br> we recommend you these news: ";
                            }
                            else{

                            }
                        }
                        else{
                            recommendationMessage.innerHTML="Because you clicked:" ;
                            if(firstEntityName!=""){
                                recommendationMessage.innerHTML+="<br> \""+firstEntityName+"\" "+ firstNumber+ " times";
                            }
                            if(secondEntityName!=""){
                                recommendationMessage.innerHTML+="<br> \""+secondEntityName+"\" "+ secondNumber+ " times";
                            }
                            if(thirdEntityName!=""){
                                recommendationMessage.innerHTML+="<br> \""+thirdEntityName+"\" "+ thirdNumber+ " times";
                            }
    
    
                            recommendationMessage.innerHTML+="<br> we recommend you these news: ";
                        }

                        if(recData.length!=0){
                            var newsNodes = {};
                            var first,second;
                            for(i=1;i<=3;i++){
                                var newsID=recData[i-1]._fields[0];
                                if(i==1){
                                    first=newsID;
                                }
                                else if(i==2){
                                    var x=2;
                                    while(newsID==first){
                                        x++;
                                        newsID=recData[x-1]._fields[0];
                                    }
                                    second=newsID;
                                }
                                else if(i==3){
                                    var y=3;
                                    while(newsID==first || newsID==second){
                                        y++;
                                        newsID=recData[y-1]._fields[0];
                                    }

                                }
                                console.log(newsID);
                                var newsRecommendationQuery = alterQuery(defaultQuery,"WHERE","a.Nid="+"\""+newsID+"\"");
                                newsRecommendationQuery = alterQuery(newsRecommendationQuery,"WHERE","a.Date>\"2020-05-19\"");
                                newsRecommendationQuery=alterQuery(newsRecommendationQuery,"RETURN","*");


                                var returnedNewsPromise = viz.returnQueryValue(newsRecommendationQuery);
                                var previousURL="";
                                returnedNewsPromise.then(res=>{
                                    var recommendationURL="";
                                    var decentNewsText="";
                                    if(res.length==0){

                                    }
                                    else{
                                        if(res[0]._fields[0].properties.hasOwnProperty("SourceURL")){
                                            recommendationURL=res[0]._fields[0].properties.SourceURL;
                                            decentNewsText=res[0]._fields[0].properties.Name;
                                        }
                                        else{
                                            recommendationURL=res[0]._fields[0].properties.Name;
                                        }

                                    }

                                    if(previousURL==recommendationURL){
                                        //dont do anything because duplicate new rec.
                                    }
                                    else{
                                        previousURL=recommendationURL;
                                        var li = document.createElement("li");
                                        var br = document.createElement("br");
                                        var newNewsRec = document.createElement('a');
    
                                        var urlText = "";
                                        if(decentNewsText==""){
                                            urlText=document.createTextNode(recommendationURL);
                                        }
                                        else{
                                            urlText=document.createTextNode(decentNewsText);
                                        }

                                        if(recommendationURL!=""){
                                            newNewsRec.appendChild(urlText);
                                            newNewsRec.href=recommendationURL;
                                            li.appendChild(newNewsRec);
                                            newsUL.appendChild(li);
                                            newsUL.appendChild(br);
                                        }
                                    }
                                })
                                
                            }



                        }
                    }


                }


            }
        });

    }


    function sortObject(obj){
        var modifiedObject = Object.keys(obj);


    }

    function reccWithOneEntities(){
        
    }
    function reccWithTwoEntities(){
        
    }
    function reccWithThreeEntities(){

    }


    function jsonParser(name) {
        return function (json) {
            if (json.parse === undefined) {
                $('#wikiInfo').html("");
            }
            else {
                $('#wikiInfo').html(json.parse.text["*"]); 
                $('#wikiInfo').fadeOut();
                var wikiInfo=document.getElementById('wikiInfo');
                const allParagraphs = wikiInfo.getElementsByTagName('p');

                var { new_name } = remove_dash_give_first(name);

                var findParagraphflag = false;

                var a = allParagraphs[0].innerText;
                var b = allParagraphs[0].innerText.split(" ")[0];
                b = b.slice(1, b.length);
                if (b.includes(","))
                    b = b.slice(0, b.indexOf(","));
                if (b == new_name.slice(1, new_name.length)) {
                    allParagraphs[0].innerText = a;
                    $('#wikiInfo').html(allParagraphs[0]);
                    findParagraphflag = true;
                    $('#wikiInfo').fadeIn();
                }
                if(allParagraphs.length<2){
                    if(!findParagraphflag){
                        $('#wikiInfo').fadeOut();
                    }
                    if(wikiInfo.innerText.length>200){
                        var splits = wikiInfo.innerText.split(".");
                        var innerText = "";
                        while(innerText.length<260){
                            if((innerText + splits[0]).length>260)
                                break;
                            innerText += splits.shift();
                            innerText += "."
                            if(splits.length === 0)
                                break;
                        }
                        wikiInfo.innerText = innerText;
                    }
                    return;
                }
                for (let index = 1; index < allParagraphs.length; index++) { // search on paragraphs to find informative one
                    if (!findParagraphflag) {
                        var argForFunc = allParagraphs[index].innerText;
                        b = argForFunc.split(" ")[0];
                        b = b.slice(1, b.length);
                        if (b.includes(","))
                            b = b.slice(0,b.indexOf(","))
                        if (b === new_name.slice(1, new_name.length)) {
                            findParagraphflag = true;
                            allParagraphs[index].innerText = argForFunc;
                            $('#wikiInfo').html(allParagraphs[index]);
                            $('#wikiInfo').fadeIn();
                            break;
                        }
                            
                    }
                    if(index == 5)
                        break;
                }
                if(wikiInfo.innerText.length>200){ // keep paragraphs short to fit in wiki box
                    var splits = wikiInfo.innerText.split(".");
                    var innerText = "";
                    while(innerText.length<260){
                        if((innerText + splits[0]).length>260)
                            break;
                        innerText += splits.shift();
                        innerText += "."
                        if(splits.length === 0)
                            break;
                    }
                    wikiInfo.innerText = innerText;
                }
                if (!findParagraphflag) {
                    $('#wikiInfo').fadeOut();
                    return;
                }
            }
            
        };
    }

function findParagraphStartingWithName(a, b, new_name, flag, i) {
    a = $("p").get(i).innerText;
    b = $("p").get(i).innerText.split(" ")[0];
    b = b.slice(1, b.length);
    if (b.includes(","))
        b = b.slice(0,b.indexOf(","))
    if (b === new_name.slice(1, new_name.length)) {
        $("p").get(i).innerText = a;
        $('#wikiInfo').html($("p").get(i));
        flag = true;
    }
    return { a, b, flag };
}

function remove_dash_give_first(name) {
    var new_name = "";
    if (name.includes('_')) {
        var splitted_name = name.split('_');
        new_name = splitted_name[0];
    }
    else
        new_name = name;
    return { new_name };
}

function add_Dash(checkIncludes, resultArray, name) {
    if (checkIncludes) {
        var tmp_name = "";
        for (var i = 0; i < resultArray.length - 1; i++) {
            tmp_name += resultArray[i];
            tmp_name += "_";
        }
        tmp_name += resultArray[resultArray.length - 1];
        name = tmp_name;
    }
    return name;
}


function checkIfIncludes(name) {
    var resultArray = [];
    var checkIncludes = false;
    if (name.includes(" ")) {
        var tmp = name.split(" ");
        var tmp2 = "";
        for (var i = 0; i < tmp.length; i++) {
            var ascii = tmp[i][0].charCodeAt();
            if (ascii >= 97)
                tmp2 += String.fromCharCode(ascii - 32);
            tmp2 += tmp[i].slice(1, tmp[i].length);
            resultArray.push(tmp2);
            tmp2 = "";
        }
        checkIncludes = true;
    }
    return { checkIncludes, resultArray };
}

     // 260 karakter siniri olsun | OK 
        // i harfi duzelsin  | OK
        // tum sayfa yuklenmesin | OK
        // 'suraya yonlendir:' kontrol edilsin | OK
        function mainWiki(name) {

            if(name.startsWith('i')){
                var tmp = "i";
                tmp += name.slice(2);
                name = tmp;
            }

            var { checkIncludes, resultArray } = checkIfIncludes(name);
            name = add_Dash(checkIncludes, resultArray, name);
            var str = 'http://tr.wikipedia.org/w/api.php?action=parse&page=' + name + '&prop=text&format=json&callback=?';
            $.getJSON(str, jsonParser(name));
            var innerTextofWikiInfo = document.getElementById("wikiInfo").innerText;
            if(innerTextofWikiInfo.startsWith("Şuraya yönlendir:")){
                $('#wikiInfo').fadeOut();
            }
            return name;
        }


    function recommendationFetching(query){
        return new Promise((resolve=>{
            viz.returnQueryValue(query).then(value=>{
                recData = value;
                resolve(true);
            });
        }));
    }


    function fetchAllData(type){
        if(type=="withRelations"){
            let query;
            query=alterQuery(defaultQuery,"MATCH","(a:News)-[r]-(b:Entity)");
            query=alterQuery(query,"WHERE","a.Date>="+currentStartDate);
            query=alterQuery(query,"WHERE","a.Date<="+currentEndDate);
            return new Promise(resolve=>{
                viz.onlyData(query).then(value=>{
                    allNodes=value.nodes;
                    allEdges=value.edges;
                    resolve(true);
                })
            })
        }
        else if(type=="noRelations"){
            let query;
            query=alterQuery(defaultQuery,"MATCH","(a:News)");
            query=alterQuery(query,"WHERE","a.Date>="+currentStartDate);
            query=alterQuery(query,"WHERE","a.Date<="+currentEndDate);
            return new Promise(resolve=>{
                viz.onlyData(query).then(value=>{
                    for(var key in value.nodes){
                        if(!allNodes.hasOwnProperty(key)){
                            //this is a new node with no entities that was not in the allnodes, so we add it
                            allNodes[key]=value.nodes[key];
                        }
                    }
                    resolve(true);
                })
            })
        }

    }

    async function queryAction(){
        var statement = document.getElementById("queryID").value;
        var query;


        if(statement==""){
            query=initQuery;
        }
        else if(isNaN(statement)){ //User wants entity or twitter news

            if(isNaN(statement.slice(1))){ //Entity, checking for twitter news
                query = alterQuery(defaultQuery,"MATCH","(a:News)-[r]-(b:Entity)");
                query = alterQuery(query,"WHERE","b.Name="+"\""+statement+"\"");
                query = alterQuery(query,"WHERE","a.Date>="+currentStartDate);
                query = alterQuery(query,"WHERE","a.Date<="+currentEndDate);
            }
            else{
                query = alterQuery(defaultQuery,"MATCH","(a:News)");
                query = alterQuery(query,"WHERE","a.Nid="+"\""+statement+"\"");
                query = alterQuery(query,"WHERE","a.Date>="+currentStartDate);
                query = alterQuery(query,"WHERE","a.Date<="+currentEndDate);
            }
        }
        else{ //User wants News
            query = alterQuery(defaultQuery,"MATCH","(a:News)");
            query = alterQuery(query,"WHERE","a.Nid="+"\""+statement+"\"");
            query = alterQuery(query,"WHERE","a.Date>="+currentStartDate);
            query = alterQuery(query,"WHERE","a.Date<="+currentEndDate);
        }
        await viz.renderPromise(query);
        addClickEvent();
    }


    async function hopQueryAction(){
        var numberOfHops = document.getElementById("hop-queryID").value;
        
        
        var query;
        var id = clickedNodesID;
        var label = allNodes[id].label;
        var title = allNodes[id].title;
        var url="";

        // Cypher Variable-length pattern matching
        if(isNaN(numberOfHops) || numberOfHops=="" ){
            query=initQuery;
        }
        else if(isNaN(label)){ //i.e. it is not a news node or a twitter news ... 


            if(isNaN(label.slice(1))){ // checking for twitter news
                //it is an entity, use name
                query = "MATCH (n {Name: \""+label+"\"} ) -[r*1.."+numberOfHops+"]-(e) RETURN *" ;
                query = alterQuery(query,"WHERE","n.Date>="+currentStartDate);
                query = alterQuery(query,"WHERE","n.Date<="+currentEndDate);
            }
            else{//it is twitter news so use Nid
                query = "MATCH (n {Nid: \""+label+"\"} ) -[r*1.."+numberOfHops+"]-(e) RETURN *" ;
                query = alterQuery(query,"WHERE","n.Date>="+currentStartDate);
                query = alterQuery(query,"WHERE","n.Date<="+currentEndDate);
            }

        }
        else{
            
            if(title.includes("SourceURL")){
                //son dakika
                let urlStart=title.indexOf("SourceURL:</strong> ")+ "SourceURL:</strong> ".length;
                let urlEnd = title.indexOf("<br>",urlStart);
                url = title.slice(urlStart,urlEnd);
            }
            else{
                var namePos=title.indexOf("Name:</strong> ")+ "Name:</strong> ".length;
                var endVar = title.lastIndexOf("<br>");
                url = title.slice(namePos,endVar)
            }
            query = "MATCH (n {Name: \""+url+"\"} ) -[r*1.."+numberOfHops+"]-(e) RETURN *" ;
            query = alterQuery(query,"WHERE","n.Date>="+currentStartDate);
            query = alterQuery(query,"WHERE","n.Date<="+currentEndDate);
        }
        await viz.renderPromise(query);
        addClickEvent();
    }

    async function datesSubmit(){
        var startDate= document.getElementById("startDate").value;
        var endDate= document.getElementById("endDate").value;
        currentStartDate=startDate;
        currentEndDate=endDate;
        var query;
        
        if (startDate>endDate){
            return;
        }
        else{
            currentStartDate="\""+startDate+"\"";
            currentEndDate="\""+endDate+"\"";
            query = alterQuery(defaultQuery,"WHERE","a.Date<="+currentEndDate);
            query = alterQuery(query,"WHERE","a.Date>="+currentStartDate);
        }
        dateChanged=true;
        await viz.renderPromise(query);
        addClickEvent();
    }

    //add checkboxes for types e.g. show only people 

    async function checkboxFunction(){
        
        var none=true;
        var peopleCheckbox= document.getElementById("peopleCheckbox");
        var locationCheckbox= document.getElementById("locationCheckbox");
        var moneyCheckbox= document.getElementById("moneyCheckbox");
        var timeCheckbox= document.getElementById("timeCheckbox");
        var organizationCheckbox= document.getElementById("organizationCheckbox");

        var query = "MATCH (n:News)-[r]-(e:Entity) WHERE ( e.Type=\"NoType\" ";

        if(peopleCheckbox.checked){
            none=false;
            query=query+"OR e.Type=\"PERSON\" ";
        }
        if(locationCheckbox.checked){
            none=false;
            query=query+"OR e.Type=\"LOCATION\" ";
        }
        if(moneyCheckbox.checked){
            none=false;
            query=query+"OR e.Type=\"MONEY\" ";
        }
        if(timeCheckbox.checked){
            none=false;
            query=query+"OR e.Type=\"TIME\" ";
        }
        if(organizationCheckbox.checked){
            none=false;
            query=query+"OR e.Type=\"ORGANIZATION\" ";
        }
        if(dateCheckbox.checked){
            none=false;
            query=query+"OR e.Type=\"DATE\" ";
        }
        if( !organizationCheckbox.checked && !organizationCheckbox.checked && !timeCheckbox.checked && !moneyCheckbox.checked && !locationCheckbox.checked && !peopleCheckbox.checked ){
            query= defaultQueryWithExclusion;
            query = alterQuery(query,"WHERE","a.Date>="+currentStartDate);
            query = alterQuery(query,"WHERE","a.Date<="+currentEndDate);
            await viz.renderPromise(query);
            addClickEvent();

            return false;
        }
        else{
            query=query+" ) return *";
        }
        query = alterQuery(query,"WHERE","n.Date>="+currentStartDate);
        query = alterQuery(query,"WHERE","n.Date<="+currentEndDate);
        
        await viz.renderPromise(query);
        addClickEvent();
        return false;
    }

    async function showAlsoCheckboxFunctions(){
        var alsoBreakingNewsCheckbox= document.getElementById("alsoBreakingNews");
        var alsoSocialMediaCheckbox= document.getElementById("alsoSocialMedia");

        var query = "MATCH (n:News) WHERE ( true  ";

        if(!alsoBreakingNewsCheckbox.checked){
            query=query+"and n.category<>\"son-dakika\" ";
        }
        if(!alsoSocialMediaCheckbox.checked){
            query=query+"and n.category<>\"social-media\" ";
        }
        query=query+" ) return *";
        query = alterQuery(query,"WHERE","n.Date>="+currentStartDate);
        query = alterQuery(query,"WHERE","n.Date<="+currentEndDate);
        await viz.renderPromise(query);
        addClickEvent();
        return false;
    }
    
    async function newsCheckboxFunction(){
        
        var none=true;
        var ex0= document.getElementById("son-dakika-checkbox");
        var ex1= document.getElementById("economy-checkbox");
        var ex2= document.getElementById("gundem-checkbox");
        var ex3= document.getElementById("world-checkbox");
        var ex4= document.getElementById("country-checkbox");
        var ex5= document.getElementById("financial-checkbox");
        var ex6= document.getElementById("corporations-checkbox");
        var ex7= document.getElementById("technology-checkbox");
        var ex8= document.getElementById("agriculture-checkbox");
        var ex9= document.getElementById("tourism-checkbox");
        var ex10= document.getElementById("social-media-checkbox");
        var others= document.getElementById("others-checkbox");

        var query="";

        if(!others.checked){
            query = "MATCH (n:News) WHERE ( n.Type=\"NoType\" ";
            if(ex0.checked){
                none=false;
                query=query+"OR n.category=\"son-dakika\" ";
            }
            if(ex1.checked){
                none=false;
                query=query+"OR n.category=\"ekonomi\" ";
            }
            if(ex2.checked){
                none=false;
                query=query+"OR n.category=\"gundem\" ";
            }
            if(ex3.checked){
                none=false;
                query=query+"OR n.category=\"dunya\" ";
            }
            if(ex4.checked){
                none=false;
                query=query+"OR n.category=\"yurttan-haberler\" ";
            }
            if(ex5.checked){
                none=false;
                query=query+"OR n.category=\"finans/haberler\" ";
            }
            if(ex6.checked){
                none=false;
                query=query+"OR n.category=\"sirketler\" ";
            }
            if(ex7.checked){
                none=false;
                query=query+"OR n.category=\"sektorler/teknoloji\" ";
            }
            if(ex8.checked){
                none=false;
                query=query+"OR n.category=\"sektorler/tarim\" ";
            }
            if(ex9.checked){
                none=false;
                query=query+"OR n.category=\"sektorler/turizm\" ";
            }
            if(ex10.checked){
                none=false;
                query=query+"OR n.category=\"social-media\" ";
            }
            if( none){
                query= defaultQueryWithExclusion;
                query = alterQuery(query,"WHERE","a.Date>="+currentStartDate);
                query = alterQuery(query,"WHERE","a.Date<="+currentEndDate);
                // query=alterQuery(query,"WHERE","a.category<>\"son-dakika\"" );
    
                await viz.renderPromise(query);
                addClickEvent();
                return false;
            }
            else{
                query=query+" ) return *";
            }
            query = alterQuery(query,"WHERE","n.Date>="+currentStartDate);
            query = alterQuery(query,"WHERE","n.Date<="+currentEndDate);
            await viz.renderPromise(query);
            addClickEvent();
            return false;
        }
        else{
            query = "MATCH (n:News) WHERE ( true ";
            if(!ex0.checked){
                query=query+"AND n.category<>\"son-dakika\" ";
            }
            if(!ex1.checked){
                query=query+"AND n.category<>\"ekonomi\" ";
            }
            if(!ex2.checked){
                query=query+"AND n.category<>\"gundem\" ";
            }
            if(!ex3.checked){
                none=false;
                query=query+"AND n.category<>\"dunya\" ";
            }
            if(!ex4.checked){
                none=false;
                query=query+"AND n.category<>\"yurttan-haberler\" ";
            }
            if(!ex5.checked){
                none=false;
                query=query+"AND n.category<>\"finans/haberler\" ";
            }
            if(!ex6.checked){
                none=false;
                query=query+"AND n.category<>\"sirketler\" ";
            }
            if(!ex7.checked){
                none=false;
                query=query+"AND n.category<>\"sektorler/teknoloji\" ";
            }
            if(!ex8.checked){
                none=false;
                query=query+"AND n.category<>\"sektorler/tarim\" ";
            }
            if(!ex9.checked){
                none=false;
                query=query+"AND n.category<>\"sektorler/turizm\" ";
            }
            if(!ex10.checked){
                none=false;
                query=query+"AND n.category<>\"social-media\" ";
            }
            query=query+" ) return *";
            query = alterQuery(query,"WHERE","n.Date>="+currentStartDate);
            query = alterQuery(query,"WHERE","n.Date<="+currentEndDate);
            await viz.renderPromise(query);
            addClickEvent();
            return false;
        }

    }

    function alterQuery(query,clause,constraint,andor="and"){
        var querySplit = query.split(" ");
        var clauseIndex = querySplit.indexOf(clause);
        if(clause=="WHERE"){

            if(clauseIndex<0){ //probably WHERE clause doesnt exist yet
                let wherePlace = querySplit.indexOf("RETURN")
                querySplit.splice(wherePlace,0,clause,constraint);
            }
            else{ //there exist a where clause 
                querySplit.splice(clauseIndex+1,0,constraint,andor);
            }

        }
        else if(clause=="MATCH"){
            querySplit[1]=constraint;
        }
        else if(clause=="RETURN"){
            let returnPlace = querySplit.indexOf("RETURN");
            querySplit[returnPlace+1]=constraint;
        }
        return Array2String(querySplit);
    }

    function Array2String(arr){
        var retValue="";
        arr.forEach(element => {
            retValue=retValue+element+" ";
        });
        return retValue;
    }