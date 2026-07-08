const Goal = require('../model/goal');
const logger = require('../utils/logger');
const sanitizeHtml = require('sanitize-html');

exports.fetchAll = async (req,res) => {
    try{
        const userId = req.session.userId;
        if(!userId){
            return res.status(401).json({message:'Unauthorized'});
        }
        const goals = await Goal.find({userId:userId});
        res.status(200).json(goals);
    }catch (error) {
        logger.error(error,'Failed to read goals from MongoDB')
        res.status(500).json({error: 'Failed to read goals from MongoDB'});
    }
}

exports.create = async (req,res) => {
    try{
        const userId = req.session.userId; //
        if(!userId){
            return res.status(401).json({message:'Unauthorized'});
        }
        const {name,deadline,target,category,type} = req.body;
        const goalData = {
            userId: userId,
            deadline:deadline,
            name: sanitizeHtml(name, { allowedTags: [] }),
            target: target,
            category: category,
            type:type,
            saved:0
        }
        const goal = new Goal(goalData);
        const result = await goal.save();
        if(result){
            return res.status(201).json({data:result, message:'Successfully created!'});
        }
        return res.status(400).json({error:'Invalid data'});
    }catch (error){
        logger.error(error,'Failed to create goal!');
        res.status(500).json({error: 'Failed to create goal'});
    }
}
exports.delete = async (req,res) => {
    try{
        const userId = req.session.userId;
        if(!userId){
            return res.status(401).json({message:'Unauthorized!'})
        }
        const id = req.params.id;
        const result = await Goal.findOneAndDelete({_id:id, userId:userId});
        if(result){
            return res.status(200).json({message:'Successfully deleted!'});
        }
        logger.error(`Failed to delete! Goal not found or access denied for goal id ${id}`);
        return res.status(404).json({error:'Goal not found'});
    }catch (error){
        logger.error(error,`Failed to delete goal! ${id}`);
        res.status(500).json({error: 'Failed to delete goal'});
    }
}
exports.update = async (req,res) => {
    try{
        const userId = req.session.userId;
        if(!userId){
            return res.status(401).json({message:'Unauthorized user requested to update!'})
        }
        const id = req.params.id;
        const {name,deadline,target,category,type,saved} = req.body;
        let updated = {}
        if(name != undefined) updated.name = sanitizeHtml(name, { allowedTags: [] });
        if(deadline != undefined) updated.deadline = deadline;
        if(target != undefined) updated.target = target;
        if(category != undefined) updated.category = category;
        if(type != undefined) updated.type = type;
        if(saved != undefined) updated.saved = saved;
        
        const result = await Goal.findOneAndUpdate({_id:id,userId:userId},{$set:updated},{new:true,runValidators:true});
        if(result){
            return res.status(200).json({data:result,message:'Successfully updated!'});
        }

        logger.error('Failed to udpdate, Goal not found')
        return res.status(404).json({error:'Goal not found'})
    }catch (error){
        logger.error(error,'Failed to update goal!');
        res.status(500).json({error:'Failed to update goal'});
    }
}



